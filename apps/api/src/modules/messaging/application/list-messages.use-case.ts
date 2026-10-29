import { Inject, Injectable } from '@nestjs/common'
import { AppError } from '../../../shared/domain/errors'
import {
  decodeMessageCursor,
  type MessageCursor
} from '../../../infrastructure/realtime/cursor'
import { HydrateAttachments } from '../../files/application/hydrate-attachments'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class ListMessagesUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly attachments: HydrateAttachments
  ) {}

  async execute(input: {
    conversationId: string
    actorId: string
    cursor?: string
    limit: number
  }) {
    await this.access.requireReadable(input.conversationId, input.actorId)
    let parsed: MessageCursor | undefined
    if (input.cursor) {
      const cursor = decodeMessageCursor(input.cursor)
      if (!cursor) {
        throw new AppError('Invalid cursor', 400, 'VALIDATION_ERROR')
      }
      parsed = cursor
    }
    const result = await this.messaging.listMessages({
      conversationId: input.conversationId,
      cursor: parsed,
      limit: input.limit
    })
    return {
      ...result,
      items: await this.attachments.messages(result.items)
    }
  }
}
