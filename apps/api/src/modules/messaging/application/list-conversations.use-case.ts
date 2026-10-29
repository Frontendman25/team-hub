import { Inject, Injectable } from '@nestjs/common'
import { ConversationAccess } from './conversation-access'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'

@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess
  ) {}

  async execute(workspaceId: string, actorId: string) {
    await this.access.requireMember(workspaceId, actorId)
    return this.messaging.listForUser(workspaceId, actorId)
  }
}
