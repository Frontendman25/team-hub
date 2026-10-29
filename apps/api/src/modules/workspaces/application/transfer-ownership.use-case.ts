import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { DemoPolicy } from './demo-policy'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class TransferOwnershipUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    userId: string
  }): Promise<void> {
    await this.demo.assertNotFrozenDemo(input.workspaceId, input.actorId)
    await this.access.requireRole(input.workspaceId, input.actorId, 'owner')
    const transferred = await this.workspaces.transferOwnership({
      workspaceId: input.workspaceId,
      fromUserId: input.actorId,
      toUserId: input.userId
    })
    if (!transferred) {
      throw new NotFoundError('Member not found')
    }
  }
}
