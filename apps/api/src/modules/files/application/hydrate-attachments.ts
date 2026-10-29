import { Inject, Injectable } from '@nestjs/common'
import type { MessageRecord } from '../../messaging/domain/types'
import type { PostRecord } from '../../posts/domain/post.repository'
import type { FilePublic } from '../domain/file.record'
import type { FilesRepository } from '../domain/files.repository'
import { FILES_REPOSITORY } from '../files.tokens'
import { serializeFile } from './serialize-file'

export type MessageWithAttachments = MessageRecord & {
  attachments: FilePublic[]
}

export type PostWithAttachments = PostRecord & {
  attachments: FilePublic[]
}

@Injectable()
export class HydrateAttachments {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly files: FilesRepository
  ) {}

  async messages(items: MessageRecord[]): Promise<MessageWithAttachments[]> {
    const grouped = await this.files.listByMessageIds(
      items.map((item) => item.id)
    )
    return items.map((item) => ({
      ...item,
      attachments: (grouped.get(item.id) ?? []).map(serializeFile)
    }))
  }

  async message(item: MessageRecord): Promise<MessageWithAttachments> {
    const [hydrated] = await this.messages([item])
    return hydrated ?? { ...item, attachments: [] }
  }

  async posts(items: PostRecord[]): Promise<PostWithAttachments[]> {
    const grouped = await this.files.listByPostIds(items.map((item) => item.id))
    return items.map((item) => ({
      ...item,
      attachments: (grouped.get(item.id) ?? []).map(serializeFile)
    }))
  }

  async post(item: PostRecord): Promise<PostWithAttachments> {
    const [hydrated] = await this.posts([item])
    return hydrated ?? { ...item, attachments: [] }
  }
}
