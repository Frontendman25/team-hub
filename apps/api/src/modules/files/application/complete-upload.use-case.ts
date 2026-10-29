import { Inject, Injectable } from '@nestjs/common'
import { AppError, ForbiddenError } from '../../../shared/domain/errors'
import type { FilesRepository } from '../domain/files.repository'
import type { ObjectStorage } from '../domain/object-storage'
import { FILES_REPOSITORY, OBJECT_STORAGE } from '../files.tokens'
import { FileAccess } from './file-access'
import { isPendingExpired } from './file-rules'
import { serializeFile } from './serialize-file'

@Injectable()
export class CompleteUploadUseCase {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly files: FilesRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    private readonly access: FileAccess
  ) {}

  async execute(input: { fileId: string; actorId: string }) {
    const file = await this.access.requireFile(input.fileId)
    if (file.uploadedBy !== input.actorId) {
      throw new ForbiddenError('You cannot complete this upload')
    }
    if (file.status === 'ready') {
      return serializeFile(file)
    }
    if (file.status !== 'pending') {
      throw new AppError('Upload session is no longer valid', 409, 'CONFLICT')
    }
    if (isPendingExpired(file.createdAt)) {
      await this.files.markFailed(file.id)
      await this.storage.delete(file.objectKey).catch(() => undefined)
      throw new AppError('Upload session expired', 409, 'UPLOAD_EXPIRED')
    }

    const head = await this.storage.head(file.objectKey)
    if (!head) {
      await this.files.markFailed(file.id)
      throw new AppError(
        'Upload was not received by storage',
        409,
        'UPLOAD_MISSING'
      )
    }
    if (head.byteSize !== file.byteSize) {
      await this.files.markFailed(file.id)
      await this.storage.delete(file.objectKey).catch(() => undefined)
      throw new AppError('Uploaded size does not match', 409, 'UPLOAD_MISMATCH')
    }

    const ready = await this.files.markReady(file.id, new Date())
    return serializeFile(ready ?? file)
  }
}
