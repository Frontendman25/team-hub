import { Inject, Injectable } from '@nestjs/common'
import { ConflictError } from '../../../shared/domain/errors'
import { slugify } from '../../workspaces/application/slug'
import type { MessagingRepository } from '../domain/messaging.repository'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class CreateChannelUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    private readonly access: ConversationAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    name: string
    topic?: string
  }) {
    await this.demo.assertNotFrozenDemo(input.workspaceId, input.actorId)
    await this.access.requireWorkspaceRole(
      input.workspaceId,
      input.actorId,
      'admin'
    )
    const slug = slugify(input.name)
    if (await this.messaging.channelSlugTaken(input.workspaceId, slug)) {
      throw new ConflictError('A channel with this name already exists')
    }
    return this.messaging.createChannel({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      slug,
      topic: input.topic?.trim() ?? '',
      createdById: input.actorId
    })
  }
}
