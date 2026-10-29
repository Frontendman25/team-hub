import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { hasAtLeast } from '../../workspaces/domain/roles'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class DeleteMessageUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly workspaces: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(messageId: string, actorId: string) {
    const message = await this.messaging.findMessage(messageId)
    if (!message || message.deletedAt) {
      throw new NotFoundError('Message not found')
    }
    const conversation = await this.access.requireReadable(
      message.conversationId,
      actorId
    )
    const membership = await this.workspaces.requireMember(
      conversation.workspaceId,
      actorId
    )
    await this.demo.assertOwnInDemo({
      workspaceId: conversation.workspaceId,
      actorId,
      ownerId: message.authorId
    })
    const canModerate = hasAtLeast(membership.role, 'admin')
    if (message.authorId !== actorId && !canModerate) {
      throw new ForbiddenError('You cannot delete this message')
    }
    const deleted = await this.messaging.softDeleteMessage(message.id)
    if (!deleted) {
      throw new NotFoundError('Message not found')
    }
    const memberIds =
      conversation.type === 'dm'
        ? await this.messaging.listMemberIds(conversation.id)
        : []
    return { message: deleted, conversation, memberIds }
  }
}
