import { Inject, Injectable } from '@nestjs/common'
import {
  AppError,
  ForbiddenError,
  NotFoundError
} from '../../../shared/domain/errors'
import type { WorkspaceRole } from '../domain/roles'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { DemoPolicy } from './demo-policy'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class ChangeMemberRoleUseCase {
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
    role: Exclude<WorkspaceRole, 'owner'>
  }): Promise<void> {
    await this.demo.assertNotFrozenDemo(input.workspaceId, input.actorId)
    if (input.userId === input.actorId) {
      throw new ForbiddenError('You cannot change your own role')
    }
    const { role: actorRole } = await this.access.requireRole(
      input.workspaceId,
      input.actorId,
      'admin'
    )
    const target = await this.workspaces.getMembership(
      input.workspaceId,
      input.userId
    )
    if (!target) {
      throw new NotFoundError('Member not found')
    }
    if (target.role === 'owner') {
      throw new AppError(
        'Transfer ownership instead of changing the owner role',
        400,
        'VALIDATION'
      )
    }
    if (
      actorRole === 'admin' &&
      (target.role !== 'member' || input.role !== 'member')
    ) {
      throw new ForbiddenError('Admins can only update members')
    }
    await this.workspaces.updateRole(
      input.workspaceId,
      input.userId,
      input.role
    )
  }
}
