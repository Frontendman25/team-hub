import { Inject, Injectable } from '@nestjs/common'
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError
} from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository
  ) {}

  async execute(invitationId: string, actorId: string) {
    const invitation = await this.workspaces.findInvitationById(invitationId)
    if (!invitation) {
      throw new NotFoundError('Invitation not found')
    }
    const email = await this.workspaces.findEmailById(actorId)
    if (!email) {
      throw new UnauthorizedError()
    }
    if (invitation.email !== email) {
      throw new ForbiddenError('This invitation was sent to a different email')
    }
    if (invitation.status !== 'pending') {
      throw new AppError('Invitation is no longer pending', 409, 'CONFLICT')
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.workspaces.setInvitationStatus(invitationId, 'revoked')
      throw new AppError('Invitation has expired', 410, 'GONE')
    }

    await this.workspaces.acceptInvitation({
      invitationId,
      workspaceId: invitation.workspaceId,
      userId: actorId,
      role: invitation.role
    })
    return this.workspaces.findById(invitation.workspaceId)
  }
}
