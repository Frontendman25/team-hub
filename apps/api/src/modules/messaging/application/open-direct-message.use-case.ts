import { Inject, Injectable } from '@nestjs/common'
import { AppError, NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../../workspaces/domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../../workspaces/workspaces.tokens'
import type { MessagingRepository } from '../domain/messaging.repository'
import { dmKeyFor } from '../domain/types'
import { MESSAGING_REPOSITORY } from '../messaging.tokens'
import { DemoPolicy } from '../../workspaces/application/demo-policy'
import { ConversationAccess } from './conversation-access'

@Injectable()
export class OpenDirectMessageUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messaging: MessagingRepository,
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: ConversationAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    userId: string
  }) {
    await this.demo.assertCanOpenDm(input.workspaceId, input.actorId)
    await this.access.requireMember(input.workspaceId, input.actorId)
    if (input.actorId === input.userId) {
      throw new AppError('Cannot message yourself', 400, 'VALIDATION_ERROR')
    }
    const peer = await this.workspaces.getMembership(
      input.workspaceId,
      input.userId
    )
    if (!peer) {
      throw new NotFoundError('Workspace member not found')
    }

    const conversation = await this.messaging.getOrCreateDm({
      workspaceId: input.workspaceId,
      dmKey: dmKeyFor(input.actorId, input.userId),
      createdById: input.actorId,
      memberIds: [input.actorId, input.userId]
    })
    const summary = await this.messaging.summarize(
      conversation.id,
      input.actorId
    )
    if (!summary) {
      throw new NotFoundError('Conversation not found')
    }
    return summary
  }
}
