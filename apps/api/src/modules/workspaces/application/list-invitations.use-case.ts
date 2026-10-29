import { Inject, Injectable } from '@nestjs/common'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class ListInvitationsUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(workspaceId: string, actorId: string) {
    await this.access.requireRole(workspaceId, actorId, 'admin')
    return this.workspaces.listInvitations(workspaceId)
  }
}
