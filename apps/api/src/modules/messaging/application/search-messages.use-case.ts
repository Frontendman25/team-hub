import { Inject, Injectable } from '@nestjs/common'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class SearchMessagesUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly attachments: HydrateAttachments
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    query: string
    limit: number
  }) {
    await this.access.requireMember(input.workspaceId, input.actorId)
    const items = await this.messaging.searchMessages({
      workspaceId: input.workspaceId,
      userId: input.actorId,
      query: input.query,
      limit: input.limit
    })
    return this.attachments.messages(items)
  }
}
