import { Inject, Injectable } from '@nestjs/common'
import type { ObjectStorage } from '../domain/object-storage'
import { FILE_DOWNLOAD_URL_TTL_SECONDS } from '../files.constants'
import { OBJECT_STORAGE } from '../files.tokens'
import { contentDisposition } from './file-rules'
import { FileAccess } from './file-access'
import { serializeFile } from './serialize-file'

@Injectable()
export class GetDownloadUseCase {
  constructor(
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    private readonly access: FileAccess
  ) {}

  async execute(input: { fileId: string; actorId: string }) {
    const file = await this.access.requireReadyDownload(
      input.fileId,
      input.actorId
    )
    const disposition = contentDisposition(file.originalName, file.contentType)
    if (this.storage.driver === 'memory') {
      return {
        strategy: 'proxy' as const,
        url: `/files/${file.id}/content`,
        expiresAt: new Date(
          Date.now() + FILE_DOWNLOAD_URL_TTL_SECONDS * 1000
        ).toISOString(),
        file: serializeFile(file)
      }
    }
    const signed = await this.storage.presignGet({
      objectKey: file.objectKey,
      contentType: file.contentType,
      filename: file.originalName,
      disposition,
      expiresInSeconds: FILE_DOWNLOAD_URL_TTL_SECONDS
    })
    return {
      strategy: 'presigned' as const,
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
      file: serializeFile(file)
    }
  }
}
