import { Readable } from 'node:stream'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../infrastructure/config/env'
import type {
  ObjectStorage,
  PresignGetInput,
  PresignPutInput,
  StoredObjectHead
} from '../domain/object-storage'
import {
  cloudinaryPublicId,
  cloudinaryResourceType
} from './cloudinary-resource'
import {
  signedAuthenticatedDeliveryUrl,
  cloudinaryUploadSignature
} from './cloudinary-signature'

type CloudinaryFetch = typeof fetch

@Injectable()
export class CloudinaryObjectStorage implements ObjectStorage {
  readonly driver = 'cloudinary' as const
  private readonly logger = new Logger(CloudinaryObjectStorage.name)
  private readonly cloudName: string
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly fetchImpl: CloudinaryFetch

  constructor(
    config: ConfigService<Env, true>,
    fetchImpl: CloudinaryFetch = fetch
  ) {
    this.cloudName = config.get('CLOUDINARY_CLOUD_NAME', { infer: true }) ?? ''
    this.apiKey = config.get('CLOUDINARY_API_KEY', { infer: true }) ?? ''
    this.apiSecret = config.get('CLOUDINARY_API_SECRET', { infer: true }) ?? ''
    this.fetchImpl = fetchImpl
  }

  async ensureReady(): Promise<void> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error(
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required'
      )
    }
  }

  async presignPut(input: PresignPutInput) {
    return {
      url: `cloudinary://put/${encodeURIComponent(input.objectKey)}`,
      headers: { 'Content-Type': input.contentType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000)
    }
  }

  async presignGet(input: PresignGetInput) {
    return {
      url: `cloudinary://get/${encodeURIComponent(input.objectKey)}`,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000)
    }
  }

  async head(objectKey: string): Promise<StoredObjectHead | null> {
    const publicId = cloudinaryPublicId(objectKey)
    for (const resourceType of ['image', 'video', 'raw'] as const) {
      const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/${resourceType}/authenticated/${encodeURIComponent(publicId)}`
      const response = await this.fetchImpl(url, {
        headers: { Authorization: this.basicAuth() }
      })
      if (response.status === 404) {
        continue
      }
      if (!response.ok) {
        this.logger.warn(
          `Cloudinary head ${response.status} for ${resourceType}`
        )
        continue
      }
      const body = (await response.json()) as {
        bytes?: number
        format?: string
      }
      return {
        byteSize: body.bytes ?? 0,
        contentType: undefined
      }
    }
    return null
  }

  async getStream(objectKey: string, range?: { start: number; end: number }) {
    const publicId = cloudinaryPublicId(objectKey)
    let lastType: 'image' | 'video' | 'raw' = 'raw'
    for (const resourceType of ['image', 'video', 'raw'] as const) {
      const delivery = signedAuthenticatedDeliveryUrl({
        cloudName: this.cloudName,
        resourceType,
        publicId,
        apiSecret: this.apiSecret
      })
      const headers: Record<string, string> = {}
      if (range) {
        headers.Range = `bytes=${range.start}-${range.end}`
      }
      const response = await this.fetchImpl(delivery, { headers })
      if (response.status === 404 || response.status === 401) {
        lastType = resourceType
        continue
      }
      if (!response.ok || !response.body) {
        this.logger.warn(
          `Cloudinary getStream ${response.status} ${resourceType}`
        )
        continue
      }
      const contentLength = Number(response.headers.get('content-length') ?? 0)
      const totalFromRange = parseTotalFromContentRange(
        response.headers.get('content-range') ?? undefined
      )
      return {
        body: Readable.fromWeb(response.body as never),
        totalSize: totalFromRange ?? contentLength,
        contentLength
      }
    }
    this.logger.warn(`Cloudinary object missing (${lastType}): ${publicId}`)
    return null
  }

  async delete(objectKey: string): Promise<void> {
    const publicId = cloudinaryPublicId(objectKey)
    for (const resourceType of ['image', 'video', 'raw'] as const) {
      const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/destroy`
      const timestamp = Math.floor(Date.now() / 1000)
      const params = {
        public_id: publicId,
        timestamp,
        type: 'authenticated'
      }
      const signature = cloudinaryUploadSignature(params, this.apiSecret)
      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        type: 'authenticated',
        api_key: this.apiKey,
        signature
      })
      await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      })
    }
  }

  async put(
    objectKey: string,
    bytes: Buffer,
    contentType: string
  ): Promise<void> {
    const publicId = cloudinaryPublicId(objectKey)
    const resourceType = cloudinaryResourceType(contentType)
    const timestamp = Math.floor(Date.now() / 1000)
    const params = {
      public_id: publicId,
      timestamp,
      type: 'authenticated'
    }
    const signature = cloudinaryUploadSignature(params, this.apiSecret)
    const form = new FormData()
    form.set(
      'file',
      new Blob([new Uint8Array(bytes)], { type: contentType }),
      publicId.split('/').pop() ?? 'upload'
    )
    form.set('api_key', this.apiKey)
    form.set('timestamp', String(timestamp))
    form.set('signature', signature)
    form.set('public_id', publicId)
    form.set('type', 'authenticated')
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`
    const response = await this.fetchImpl(url, { method: 'POST', body: form })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(
        `Cloudinary upload failed (${response.status}): ${detail}`
      )
    }
  }

  private basicAuth(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`
  }
}

function parseTotalFromContentRange(header?: string): number | null {
  if (!header) {
    return null
  }
  const match = /\/(\d+)$/.exec(header)
  if (!match) {
    return null
  }
  const total = Number(match[1])
  return Number.isSafeInteger(total) ? total : null
}
