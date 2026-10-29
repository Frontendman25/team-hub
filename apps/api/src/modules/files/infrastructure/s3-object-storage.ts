import { Readable } from 'node:stream'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../infrastructure/config/env'
import type {
  ObjectStorage,
  PresignGetInput,
  PresignPutInput,
  StoredObjectHead
} from '../domain/object-storage'

@Injectable()
export class S3ObjectStorage implements ObjectStorage {
  readonly driver = 's3' as const
  private readonly logger = new Logger(S3ObjectStorage.name)
  private readonly bucket: string
  private readonly ops: S3Client
  private readonly signer: S3Client

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true }) ?? 'teamhub'
    const region = config.get('S3_REGION', { infer: true })
    const endpoint = config.get('S3_ENDPOINT', { infer: true })
    const publicEndpoint =
      config.get('S3_PUBLIC_ENDPOINT', { infer: true }) ?? endpoint
    const credentials = {
      accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }) ?? '',
      secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }) ?? ''
    }
    const forcePathStyle = config.get('S3_FORCE_PATH_STYLE', { infer: true })
    const shared: S3ClientConfig = {
      region,
      credentials,
      forcePathStyle
    }
    this.ops = new S3Client({ ...shared, endpoint })
    this.signer = new S3Client({ ...shared, endpoint: publicEndpoint })
  }

  async ensureReady(): Promise<void> {
    try {
      await this.ops.send(new CreateBucketCommand({ Bucket: this.bucket }))
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      if (
        name !== 'BucketAlreadyOwnedByYou' &&
        name !== 'BucketAlreadyExists'
      ) {
        this.logger.warn(
          `CreateBucket skipped: ${error instanceof Error ? error.message : 'unknown'}`
        )
      }
    }
    try {
      const origin = (
        process.env.FRONTEND_URL ?? 'http://localhost:3000'
      ).replace(/\/$/, '')
      await this.ops.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'HEAD'],
                AllowedOrigins: [origin],
                ExposeHeaders: ['ETag', 'Content-Length'],
                MaxAgeSeconds: 3600
              }
            ]
          }
        })
      )
    } catch (error) {
      this.logger.warn(
        `PutBucketCors skipped: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  async presignPut(input: PresignPutInput) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.byteSize
    })
    const url = await getSignedUrl(this.signer, command, {
      expiresIn: input.expiresInSeconds
    })
    return {
      url,
      headers: { 'Content-Type': input.contentType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000)
    }
  }

  async presignGet(input: PresignGetInput) {
    const encoded = encodeURIComponent(input.filename).replace(/['()]/g, '')
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ResponseContentType: input.contentType,
      ResponseContentDisposition: `${input.disposition}; filename="${encoded}"; filename*=UTF-8''${encoded}`
    })
    const url = await getSignedUrl(this.signer, command, {
      expiresIn: input.expiresInSeconds
    })
    return {
      url,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000)
    }
  }

  async head(objectKey: string): Promise<StoredObjectHead | null> {
    try {
      const result = await this.ops.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey })
      )
      return {
        byteSize: result.ContentLength ?? 0,
        contentType: result.ContentType
      }
    } catch {
      return null
    }
  }

  async getStream(objectKey: string, range?: { start: number; end: number }) {
    try {
      const result = await this.ops.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {})
        })
      )
      const body = result.Body
      if (!body) {
        return null
      }
      const contentLength = result.ContentLength ?? 0
      const totalFromRange = parseTotalFromContentRange(result.ContentRange)
      return {
        body: body as Readable,
        totalSize: totalFromRange ?? contentLength,
        contentLength
      }
    } catch {
      return null
    }
  }

  async delete(objectKey: string): Promise<void> {
    await this.ops.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey })
    )
  }

  async put(
    objectKey: string,
    bytes: Buffer,
    contentType: string
  ): Promise<void> {
    await this.ops.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: bytes,
        ContentType: contentType,
        ContentLength: bytes.byteLength
      })
    )
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
