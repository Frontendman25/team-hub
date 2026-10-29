import { Inject, Injectable } from '@nestjs/common'
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError
} from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

@Injectable()
export class DeclineInvitationUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository
  ) {}

  async execute(invitationId: string, actorId: string): Promise<void> {
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
    await this.workspaces.setInvitationStatus(invitationId, 'declined')
  }
}
