import { Inject, Injectable } from '@nestjs/common'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class MarkConversationReadUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess
  ) {}

  async execute(conversationId: string, actorId: string) {
    await this.access.requireReadable(conversationId, actorId)
    await this.messaging.markRead(conversationId, actorId, new Date())
    return this.messaging.summarize(conversationId, actorId)
  }
}
