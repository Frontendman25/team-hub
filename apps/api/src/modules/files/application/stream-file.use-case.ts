import { Inject, Injectable } from '@nestjs/common'
import { AppError, NotFoundError } from '../../../shared/domain/errors'
import type { ObjectStorage } from '../domain/object-storage'
import { OBJECT_STORAGE } from '../files.tokens'
import { contentDisposition } from './file-rules'
import { FileAccess } from './file-access'
import { parseByteRange } from './parse-byte-range'

@Injectable()
export class StreamFileUseCase {
  constructor(
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    private readonly access: FileAccess
  ) {}

  async execute(input: {
    fileId: string
    actorId: string
    rangeHeader?: string
  }) {
    const file = await this.access.requireReadyDownload(
      input.fileId,
      input.actorId
    )
    const parsed = parseByteRange(input.rangeHeader, file.byteSize)
    if (parsed.type === 'unsatisfiable') {
      throw new AppError(
        'Range not satisfiable',
        416,
        'RANGE_NOT_SATISFIABLE',
        {
          total: file.byteSize
        }
      )
    }
    const range =
      parsed.type === 'partial'
        ? { start: parsed.start, end: parsed.end }
        : undefined
    const object = await this.storage.getStream(file.objectKey, range)
    if (!object) {
      throw new NotFoundError('File content is not available')
    }
    return {
      file,
      body: object.body,
      totalSize: object.totalSize,
      contentLength: object.contentLength,
      partial: parsed.type === 'partial' ? parsed : null,
      disposition: contentDisposition(file.originalName, file.contentType)
    }
  }
}
