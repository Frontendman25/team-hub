import { Inject, Injectable } from '@nestjs/common'
import { AppError, ForbiddenError } from '../../../shared/domain/errors'
import type { ObjectStorage } from '../domain/object-storage'
import { OBJECT_STORAGE } from '../files.tokens'
import { FileAccess } from './file-access'
import { isPendingExpired } from './file-rules'

@Injectable()
export class ReceiveUploadUseCase {
  constructor(
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    private readonly access: FileAccess
  ) {}

  async execute(input: {
    fileId: string
    actorId: string
    bytes: Buffer
  }): Promise<void> {
    const file = await this.access.requireFile(input.fileId)
    if (file.uploadedBy !== input.actorId) {
      throw new ForbiddenError('You cannot upload this file')
    }
    if (file.status !== 'pending') {
      throw new AppError('Upload session is no longer valid', 409, 'CONFLICT')
    }
    if (isPendingExpired(file.createdAt)) {
      throw new AppError('Upload session expired', 409, 'UPLOAD_EXPIRED')
    }
    if (input.bytes.byteLength !== file.byteSize) {
      throw new AppError('Uploaded size does not match', 409, 'UPLOAD_MISMATCH')
    }
    await this.storage.put(file.objectKey, input.bytes, file.contentType)
  }
}
