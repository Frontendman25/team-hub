import type { Readable } from 'node:stream'

export type PresignPutInput = {
  objectKey: string
  contentType: string
  byteSize: number
  expiresInSeconds: number
}

export type PresignGetInput = {
  objectKey: string
  contentType: string
  filename: string
  disposition: 'inline' | 'attachment'
  expiresInSeconds: number
}

export type StoredObjectHead = {
  byteSize: number
  contentType?: string
}

export interface ObjectStorage {
  readonly driver: 'memory' | 's3'
  ensureReady(): Promise<void>
  presignPut(
    input: PresignPutInput
  ): Promise<{ url: string; headers: Record<string, string>; expiresAt: Date }>
  presignGet(input: PresignGetInput): Promise<{ url: string; expiresAt: Date }>
  head(objectKey: string): Promise<StoredObjectHead | null>
  getStream(
    objectKey: string,
    range?: { start: number; end: number }
  ): Promise<{
    body: Readable
    totalSize: number
    contentLength: number
  } | null>
  delete(objectKey: string): Promise<void>
  put(objectKey: string, bytes: Buffer, contentType: string): Promise<void>
}
