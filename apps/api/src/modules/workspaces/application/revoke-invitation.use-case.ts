import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { WorkspaceAccess } from './workspace-access'

@Injectable()
export class RevokeInvitationUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    invitationId: string
  }): Promise<void> {
    await this.access.requireRole(input.workspaceId, input.actorId, 'admin')
    const invitation = await this.workspaces.findInvitationById(
      input.invitationId
    )
    if (!invitation || invitation.workspaceId !== input.workspaceId) {
      throw new NotFoundError('Invitation not found')
    }
    await this.workspaces.setInvitationStatus(input.invitationId, 'revoked')
  }
}
