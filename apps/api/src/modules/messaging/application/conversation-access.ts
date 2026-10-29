import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { WorkspaceAccess } from '../../workspaces/application/workspace-access'
import type { WorkspaceRole } from '../../workspaces/domain/roles'
import type { MessagingRepository } from '../domain/messaging.repository'
import type { ConversationRow } from '../domain/types'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'

@Injectable()
export class ConversationAccess {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly workspaces: WorkspaceAccess
  ) {}

  async requireReadable(
    conversationId: string,
    userId: string
  ): Promise<ConversationRow> {
    const conversation = await this.messaging.findConversation(conversationId)
    if (!conversation) {
      throw new NotFoundError('Conversation not found')
    }

    await this.workspaces.requireMember(conversation.workspaceId, userId)

    if (conversation.type === 'dm') {
      const member = await this.messaging.isDmMember(conversationId, userId)
      if (!member) {
        throw new NotFoundError('Conversation not found')
      }
    }

    return conversation
  }

  async requireWorkspaceRole(
    workspaceId: string,
    userId: string,
    minimum: WorkspaceRole
  ) {
    return this.workspaces.requireRole(workspaceId, userId, minimum)
  }

  async requireMember(workspaceId: string, userId: string) {
    return this.workspaces.requireMember(workspaceId, userId)
  }

  async assertCanModerate(
    conversation: ConversationRow,
    userId: string
  ): Promise<void> {
    const access = await this.workspaces.requireMember(
      conversation.workspaceId,
      userId
    )
    if (access.role === 'member' && conversation.type === 'channel') {
      throw new ForbiddenError('Insufficient workspace role')
    }
  }
}
