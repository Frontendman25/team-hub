import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, NotFoundError } from '../../../shared/domain/errors'
import { slugify } from '../../workspaces/application/slug'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class UpdateChannelUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    conversationId: string
    actorId: string
    name?: string
    topic?: string
  }) {
    const conversation = await this.access.requireReadable(
      input.conversationId,
      input.actorId
    )
    if (conversation.type !== 'channel') {
      throw new NotFoundError('Channel not found')
    }
    await this.demo.assertNotFrozenDemo(conversation.workspaceId, input.actorId)
    await this.access.requireWorkspaceRole(
      conversation.workspaceId,
      input.actorId,
      'admin'
    )

    const slug = input.name ? slugify(input.name) : undefined
    if (
      slug &&
      (await this.messaging.channelSlugTaken(
        conversation.workspaceId,
        slug,
        conversation.id
      ))
    ) {
      throw new ConflictError('A channel with this name already exists')
    }

    const updated = await this.messaging.updateChannel(conversation.id, {
      name: input.name?.trim(),
      topic: input.topic?.trim(),
      slug
    })
    if (!updated) {
      throw new NotFoundError('Channel not found')
    }
    return updated
  }
}
