import { Inject, Injectable } from '@nestjs/common'
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors'
import { hasAtLeast, type WorkspaceRole } from '../domain/roles'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

@Injectable()
export class WorkspaceAccess {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository
  ) {}

  async requireMember(workspaceId: string, userId: string) {
    const workspace = await this.workspaces.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError('Workspace not found')
    }
    const membership = await this.workspaces.getMembership(workspaceId, userId)
    if (!membership) {
      throw new ForbiddenError('You are not a member of this workspace')
    }
    return { workspace, role: membership.role }
  }

  async requireRole(
    workspaceId: string,
    userId: string,
    minimum: WorkspaceRole
  ) {
    const access = await this.requireMember(workspaceId, userId)
    if (!hasAtLeast(access.role, minimum)) {
      throw new ForbiddenError('Insufficient workspace role')
    }
    return access
  }
}
