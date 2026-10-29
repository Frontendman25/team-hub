import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { DemoPolicy } from './demo-policy'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class RemoveMemberUseCase {
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
    const leaving = input.actorId === input.userId
    if (!leaving) {
      await this.demo.assertNotFrozenDemo(input.workspaceId, input.actorId)
    }
    const { role: actorRole } = await this.access.requireMember(
      input.workspaceId,
      input.actorId
    )

    if (leaving) {
      if (actorRole === 'owner') {
        const owners = await this.workspaces.countByRole(
          input.workspaceId,
          'owner'
        )
        if (owners <= 1) {
          throw new ForbiddenError(
            'Transfer ownership before leaving as the last owner'
          )
        }
      }
      await this.workspaces.removeMember(input.workspaceId, input.userId)
      return
    }

    if (actorRole !== 'owner' && actorRole !== 'admin') {
      throw new ForbiddenError('Insufficient workspace role')
    }
    const target = await this.workspaces.getMembership(
      input.workspaceId,
      input.userId
    )
    if (!target) {
      throw new NotFoundError('Member not found')
    }
    if (target.role === 'owner') {
      throw new ForbiddenError('You cannot remove an owner')
    }
    if (actorRole === 'admin' && target.role !== 'member') {
      throw new ForbiddenError('Admins can only remove members')
    }
    await this.workspaces.removeMember(input.workspaceId, input.userId)
  }
}
