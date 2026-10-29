import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { AppError, TooManyRequestsError } from '../../../shared/domain/errors'
import { GUEST_FILE_MAX_COUNT } from '../../demo/demo.constants'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { FilesRepository } from '../domain/files.repository'
import type { ObjectStorage } from '../domain/object-storage'
import { FILE_UPLOAD_URL_TTL_SECONDS } from '../files.constants'
import { FILES_REPOSITORY, OBJECT_STORAGE } from '../files.tokens'
import { UploadRateLimiter } from '../infrastructure/upload-rate-limiter'
import {
  assertAllowedUpload,
  assertQuota,
  normalizeContentType
} from './file-rules'
import { objectKeyFor, sanitizeFilename } from './sanitize-filename'
import { serializeFile } from './serialize-file'

@Injectable()
export class InitiateUploadUseCase {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly files: FilesRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy,
    private readonly rateLimiter: UploadRateLimiter
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    originalName: string
    contentType: string
    byteSize: number
  }) {
    const allowed = await this.rateLimiter.allow(input.actorId)
    if (!allowed) {
      throw new TooManyRequestsError('Too many uploads — try again later')
    }
    await this.access.requireMember(input.workspaceId, input.actorId)
    const contentType = normalizeContentType(input.contentType)
    await this.demo.assertGuestUpload({
      actorId: input.actorId,
      contentType,
      byteSize: input.byteSize
    })
    const actor = await this.demo.actor(input.actorId)
    if (actor.accountKind === 'guest') {
      const used = await this.files.countActiveByUploader(input.actorId)
      if (used >= GUEST_FILE_MAX_COUNT) {
        throw new AppError(
          'Demo visitors can upload at most 3 files',
          400,
          'QUOTA_EXCEEDED'
        )
      }
    }
    assertAllowedUpload(input)
    const used = await this.files.workspaceUsageBytes(input.workspaceId)
    assertQuota(used, input.byteSize)

    const fileId = randomUUID()
    const originalName = sanitizeFilename(input.originalName)
    const objectKey = objectKeyFor({
      workspaceId: input.workspaceId,
      fileId,
      filename: originalName
    })
    const file = await this.files.createPending({
      id: fileId,
      workspaceId: input.workspaceId,
      uploadedBy: input.actorId,
      originalName,
      contentType,
      byteSize: input.byteSize,
      objectKey
    })
    const upload = await this.storage.presignPut({
      objectKey,
      contentType,
      byteSize: input.byteSize,
      expiresInSeconds: FILE_UPLOAD_URL_TTL_SECONDS
    })
    return {
      file: serializeFile(file),
      uploadUrl: upload.url,
      uploadHeaders: upload.headers,
      expiresAt: upload.expiresAt.toISOString()
    }
  }
}
