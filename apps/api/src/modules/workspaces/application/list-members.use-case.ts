import { Inject, Injectable } from '@nestjs/common'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class ListMembersUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(workspaceId: string, actorId: string) {
    const membership = await this.access.requireMember(workspaceId, actorId)
    const members = await this.workspaces.listMembers(workspaceId)
    if (membership.workspace.kind !== 'demo') {
      return members
    }
    return members.map((member) => ({ ...member, email: '' }))
  }
}
