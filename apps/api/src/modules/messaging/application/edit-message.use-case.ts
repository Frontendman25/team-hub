import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class EditMessageUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly attachments: HydrateAttachments
  ) {}

  async execute(input: {
    messageId: string
    actorId: string
    content: string
  }) {
    const message = await this.messaging.findMessage(input.messageId)
    if (!message || message.deletedAt) {
      throw new NotFoundError('Message not found')
    }
    const conversation = await this.access.requireReadable(
      message.conversationId,
      input.actorId
    )
    if (message.authorId !== input.actorId) {
      throw new ForbiddenError('You can only edit your own messages')
    }
    const memberIds =
      conversation.type === 'dm'
        ? await this.messaging.listMemberIds(conversation.id)
        : []
    if (message.content === input.content) {
      return {
        message: await this.attachments.message(message),
        conversation,
        memberIds,
        changed: false as const
      }
    }
    const updated = await this.messaging.updateMessageContent(
      message.id,
      input.content
    )
    if (!updated) {
      throw new NotFoundError('Message not found')
    }
    return {
      message: await this.attachments.message(updated),
      conversation,
      memberIds,
      changed: true as const
    }
  }
}
