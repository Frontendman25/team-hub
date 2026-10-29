import { Inject, Injectable, Logger } from '@nestjs/common'
import { CreateNotificationUseCase } from '../../notifications/application/create-notification.use-case'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'

@Injectable()
export class NotifyInvitationUseCase {
  private readonly logger = new Logger(NotifyInvitationUseCase.name)

  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly notify: CreateNotificationUseCase
  ) {}

  async execute(invitationId: string): Promise<void> {
    const invitation = await this.workspaces.findInvitationById(invitationId)
    if (!invitation || invitation.status !== 'pending') {
      this.logger.debug(`Skipping stale invitation job ${invitationId}`)
      return
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      return
    }
    const recipientId = await this.workspaces.findUserIdByEmail(
      invitation.email
    )
    if (!recipientId) {
      return
    }
    await this.notify.execute({
      recipientId,
      actorId: invitation.invitedById,
      type: 'invitation',
      workspaceId: invitation.workspaceId,
      invitationId: invitation.id
    })
    this.logger.log(`Created invitation notification for ${recipientId}`)
  }
}
