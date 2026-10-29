import { Inject, Injectable } from '@nestjs/common'
import { AppError, TooManyRequestsError } from '../../../shared/domain/errors'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import { FILE_MAX_ATTACHMENTS } from '../../files/files.constants'
import { GuestWriteLimiter } from '../../auth/infrastructure/guest-write-limiter'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { MessageRateLimiter } from '../infrastructure/message-rate-limiter'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly rateLimiter: MessageRateLimiter,
    private readonly attachments: HydrateAttachments,
    private readonly demo: DemoPolicy,
    private readonly guestWrites: GuestWriteLimiter
  ) {}

  async execute(input: {
    conversationId: string
    actorId: string
    content: string
    clientId: string
    attachmentIds?: string[]
  }) {
    const allowed = await this.rateLimiter.allow(input.actorId)
    if (!allowed) {
      throw new TooManyRequestsError('Slow down — too many messages')
    }
    const attachmentIds = input.attachmentIds ?? []
    if (attachmentIds.length > FILE_MAX_ATTACHMENTS) {
      throw new AppError('Too many attachments', 400, 'VALIDATION')
    }
    if (!input.content.trim() && attachmentIds.length === 0) {
      throw new AppError('Message cannot be empty', 400, 'VALIDATION')
    }
    await this.guestWrites.assertFor(this.demo, input.actorId)
    const conversation = await this.access.requireReadable(
      input.conversationId,
      input.actorId
    )
    const result = await this.messaging.insertMessage({
      conversationId: input.conversationId,
      workspaceId: conversation.workspaceId,
      authorId: input.actorId,
      content: input.content,
      clientId: input.clientId,
      attachmentIds
    })
    const message = await this.attachments.message(result.message)
    const memberIds =
      conversation.type === 'dm'
        ? await this.messaging.listMemberIds(conversation.id)
        : []
    return { ...result, message, conversation, memberIds }
  }
}
