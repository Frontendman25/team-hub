import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { CloudinaryObjectStorage } from '../../src/modules/files/infrastructure/cloudinary-object-storage'
import type { Env } from '../../src/infrastructure/config/env'

function config(): ConfigService<Env, true> {
  return {
    get: (key: string) => {
      const values: Record<string, string> = {
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'secret'
      }
      return values[key]
    }
  } as never
}

describe('CloudinaryObjectStorage', () => {
  it('does not hand the browser a Cloudinary URL from presignGet', async () => {
    const storage = new CloudinaryObjectStorage(config())
    const signed = await storage.presignGet({
      objectKey: 'ws/file/photo.jpg',
      contentType: 'image/jpeg',
      filename: 'photo.jpg',
      disposition: 'inline',
      expiresInSeconds: 60
    })
    expect(signed.url.startsWith('cloudinary://')).toBe(true)
    expect(signed.url.includes('res.cloudinary.com')).toBe(false)
  })

  it('uploads as authenticated and streams Range bytes through Nest', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/image/upload')) {
          return new Response(
            JSON.stringify({ public_id: 'ws/file/photo.jpg' }),
            {
              status: 200
            }
          )
        }
        if (url.includes('/resources/image/authenticated/')) {
          return new Response(JSON.stringify({ bytes: 4 }), { status: 200 })
        }
        if (url.includes('res.cloudinary.com')) {
          expect(init?.headers).toMatchObject({ Range: 'bytes=0-1' })
          return new Response(Buffer.from('ab'), {
            status: 206,
            headers: {
              'content-length': '2',
              'content-range': 'bytes 0-1/4'
            }
          })
        }
        if (url.includes('/destroy')) {
          return new Response(JSON.stringify({ result: 'ok' }), { status: 200 })
        }
        return new Response('missing', { status: 404 })
      }
    )
    const storage = new CloudinaryObjectStorage(config(), fetchMock as never)
    await storage.put('ws/file/photo.jpg', Buffer.from('abcd'), 'image/jpeg')
    const head = await storage.head('ws/file/photo.jpg')
    expect(head?.byteSize).toBe(4)
    const stream = await storage.getStream('ws/file/photo.jpg', {
      start: 0,
      end: 1
    })
    expect(stream?.totalSize).toBe(4)
    expect(stream?.contentLength).toBe(2)
    expect(stream?.body).toBeInstanceOf(Readable)
    await storage.delete('ws/file/photo.jpg')
    const uploadCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/image/upload')
    )
    expect(uploadCall).toBeTruthy()
  })
})
