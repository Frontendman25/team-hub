import { Inject, Injectable } from '@nestjs/common'
import type { FilesRepository } from '../domain/files.repository'
import type { ObjectStorage } from '../domain/object-storage'
import { FILES_REPOSITORY, OBJECT_STORAGE } from '../files.tokens'
import { FileAccess } from './file-access'

@Injectable()
export class DeleteFileUseCase {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly files: FilesRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    private readonly access: FileAccess
  ) {}

  async execute(input: { fileId: string; actorId: string }): Promise<void> {
    const file = await this.access.requireMutable(input.fileId, input.actorId)
    await this.files.markDeleted(file.id)
    await this.storage.delete(file.objectKey).catch(() => undefined)
  }
}
