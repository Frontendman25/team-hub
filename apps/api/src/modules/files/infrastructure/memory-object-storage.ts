import { Readable } from 'node:stream'
import { Injectable } from '@nestjs/common'
import type {
  ObjectStorage,
  PresignGetInput,
  PresignPutInput,
  StoredObjectHead
} from '../domain/object-storage'
import {
  deleteLocalObject,
  readLocalObject,
  usesLocalObjectDisk,
  writeLocalObject
} from './local-object-store'

type Stored = {
  bytes: Buffer
  contentType: string
}

function sliceStream(
  bytes: Buffer,
  range?: { start: number; end: number },
  totalSize = bytes.byteLength
) {
  if (!range) {
    return {
      body: Readable.from(bytes),
      totalSize,
      contentLength: bytes.byteLength
    }
  }
  const slice = bytes.subarray(range.start, range.end + 1)
  return {
    body: Readable.from(slice),
    totalSize,
    contentLength: slice.byteLength
  }
}

@Injectable()
export class MemoryObjectStorage implements ObjectStorage {
  readonly driver = 'memory' as const
  private readonly objects = new Map<string, Stored>()
  private readonly reserved = new Map<string, StoredObjectHead>()

  async ensureReady(): Promise<void> {
    return
  }

  async presignPut(input: PresignPutInput) {
    this.reserved.set(input.objectKey, {
      byteSize: input.byteSize,
      contentType: input.contentType
    })
    const bytes = Buffer.alloc(input.byteSize)
    this.objects.set(input.objectKey, {
      bytes,
      contentType: input.contentType
    })
    await this.persist(input.objectKey, bytes)
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000)
    return {
      url: `memory://put/${encodeURIComponent(input.objectKey)}`,
      headers: { 'Content-Type': input.contentType },
      expiresAt
    }
  }

  async presignGet(input: PresignGetInput) {
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000)
    return {
      url: `memory://get/${encodeURIComponent(input.objectKey)}`,
      expiresAt
    }
  }

  async head(objectKey: string): Promise<StoredObjectHead | null> {
    const stored = await this.load(objectKey)
    if (stored) {
      return {
        byteSize: stored.bytes.byteLength,
        contentType: stored.contentType
      }
    }
    return this.reserved.get(objectKey) ?? null
  }

  async getStream(objectKey: string, range?: { start: number; end: number }) {
    const stored = await this.load(objectKey)
    if (stored) {
      return sliceStream(stored.bytes, range)
    }
    const reserved = this.reserved.get(objectKey)
    if (!reserved) {
      return null
    }
    return sliceStream(Buffer.alloc(0), range, reserved.byteSize)
  }

  async delete(objectKey: string): Promise<void> {
    this.objects.delete(objectKey)
    this.reserved.delete(objectKey)
    if (usesLocalObjectDisk()) {
      await deleteLocalObject(objectKey)
    }
  }

  async put(
    objectKey: string,
    bytes: Buffer,
    contentType: string
  ): Promise<void> {
    this.objects.set(objectKey, { bytes, contentType })
    this.reserved.set(objectKey, {
      byteSize: bytes.byteLength,
      contentType
    })
    await this.persist(objectKey, bytes)
  }

  private async persist(objectKey: string, bytes: Buffer): Promise<void> {
    if (usesLocalObjectDisk()) {
      await writeLocalObject(objectKey, bytes)
    }
  }

  private async load(objectKey: string): Promise<Stored | null> {
    const cached = this.objects.get(objectKey)
    if (cached) {
      return cached
    }
    if (!usesLocalObjectDisk()) {
      return null
    }
    const bytes = await readLocalObject(objectKey)
    if (!bytes) {
      return null
    }
    const reserved = this.reserved.get(objectKey)
    const stored = {
      bytes,
      contentType: reserved?.contentType ?? 'application/octet-stream'
    }
    this.objects.set(objectKey, stored)
    return stored
  }

  putForTests(objectKey: string, bytes: Buffer, contentType: string): void {
    this.objects.set(objectKey, { bytes, contentType })
  }
}
