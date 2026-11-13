import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { CloudinaryObjectStorage } from '../../src/modules/files/infrastructure/cloudinary-object-storage'
import type { Env } from '../../src/infrastructure/config/env'
import { cloudinaryDeliverySignature } from '../../src/modules/files/infrastructure/cloudinary-signature'

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
          return new Response(JSON.stringify({ bytes: 4, format: 'jpg' }), {
            status: 200
          })
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

  it.each([
    ['clip.webm', 'video', 'webm', 'clip.webm.webm'],
    ['voice.webm', 'video', 'webm', 'voice.webm.webm'],
    ['clip.bin', 'video', 'webm', 'clip.bin.webm'],
    ['photo.jpg', 'image', 'jpg', 'photo.jpg.jpg'],
    ['recording', 'video', 'mp4', 'recording.mp4'],
    ['document.txt', 'raw', undefined, 'document.txt']
  ] as const)(
    'delivers %s using its actual resource type and stored format',
    async (filename, resourceType, format, deliveryName) => {
      const objectKey = `ws/file/${filename}`
      const path = `ws/file/${deliveryName}`
      const signature = cloudinaryDeliverySignature(path, 'secret')
      const expected = `https://res.cloudinary.com/demo/${resourceType}/authenticated/s--${signature}--/${path}`
      const fetchMock = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          if (url.includes('/resources/')) {
            expect(init?.headers).toHaveProperty('Authorization')
            return url.includes(`/resources/${resourceType}/authenticated/`)
              ? new Response(JSON.stringify({ bytes: 4, format }), {
                  status: 200
                })
              : new Response('missing', { status: 404 })
          }
          // The original implementation omitted the format and would return 404.
          if (url !== expected) return new Response('missing', { status: 404 })
          expect(init?.headers).toEqual({ Range: 'bytes=0-1' })
          return new Response(Buffer.from('ab'), {
            status: 206,
            headers: { 'content-length': '2', 'content-range': 'bytes 0-1/4' }
          })
        }
      )
      const storage = new CloudinaryObjectStorage(config(), fetchMock as never)
      const stream = await storage.getStream(objectKey, { start: 0, end: 1 })
      expect(stream?.totalSize).toBe(4)
      expect(stream?.contentLength).toBe(2)
      expect(stream).not.toBeNull()
      const chunks: Buffer[] = []
      for await (const chunk of stream!.body) chunks.push(Buffer.from(chunk))
      expect(Buffer.concat(chunks).toString()).toBe('ab')
      const deliveries = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('res.cloudinary.com')
      )
      expect(deliveries).toHaveLength(1)
      expect(String(deliveries[0][0])).toBe(expected)
    }
  )

  it('does not fall back to public delivery when authenticated delivery is denied', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/resources/image/'))
        return new Response('missing', { status: 404 })
      if (url.includes('/resources/video/'))
        return new Response(JSON.stringify({ bytes: 4, format: 'webm' }))
      return new Response('denied', { status: 401 })
    })
    const storage = new CloudinaryObjectStorage(config(), fetchMock as never)
    expect(await storage.getStream('ws/file/clip.webm')).toBeNull()
    expect(
      fetchMock.mock.calls.every(
        ([url]) => !String(url).includes('/video/upload/')
      )
    ).toBe(true)
  })
})
