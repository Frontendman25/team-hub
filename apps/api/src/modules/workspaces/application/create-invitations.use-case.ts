import { Inject, Injectable } from '@nestjs/common'
import { AppError, UnauthorizedError } from '../../../shared/domain/errors'
import type { InviteRole } from '../domain/roles'
import type { WorkspaceRepository } from '../domain/workspace.repository'
import { InvitationQueue } from '../infrastructure/invitation.queue'
import { WORKSPACES_REPOSITORY } from '../workspaces.tokens'
import { DemoPolicy } from './demo-policy'
import { WorkspaceAccess } from './workspace-access'

const INVITE_TTL_DAYS = 14

export type InviteInput = { email: string; role: InviteRole }

@Injectable()
export class CreateInvitationsUseCase {
  constructor(
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly access: WorkspaceAccess,
    private readonly queue: InvitationQueue,
    private readonly demo: DemoPolicy
  ) {}

  async execute(input: {
    workspaceId: string
    actorId: string
    invites: InviteInput[]
  }) {
    await this.demo.assertNotFrozenDemo(input.workspaceId, input.actorId)
    await this.access.requireRole(input.workspaceId, input.actorId, 'admin')
    const actorEmail = await this.workspaces.findEmailById(input.actorId)
    if (!actorEmail) {
      throw new UnauthorizedError()
    }
    const members = await this.workspaces.listMembers(input.workspaceId)
    const memberEmails = new Set(members.map((member) => member.email))
    const pending = await this.workspaces.listInvitations(input.workspaceId)
    const pendingEmails = new Set(
      pending.filter((row) => row.status === 'pending').map((row) => row.email)
    )
    const errors: { index: number; email: string; message: string }[] = []
    const accepted: InviteInput[] = []

    input.invites.forEach((invite, index) => {
      const email = invite.email.trim().toLowerCase()
      if (email === actorEmail) {
        errors.push({
          index,
          email,
          message: 'You cannot invite yourself'
        })
        return
      }
      if (memberEmails.has(email)) {
        errors.push({
          index,
          email,
          message: 'This person is already a member'
        })
        return
      }
      if (pendingEmails.has(email)) {
        errors.push({
          index,
          email,
          message: 'An invitation is already pending for this email'
        })
        return
      }
      if (accepted.some((row) => row.email === email)) {
        errors.push({
          index,
          email,
          message: 'Duplicate email in this request'
        })
        return
      }
      accepted.push({ email, role: invite.role })
    })

    if (accepted.length === 0) {
      throw new AppError('No invitations were created', 400, 'VALIDATION', {
        errors
      })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS)

    const created = await this.workspaces.createInvitations(
      accepted.map((invite) => ({
        workspaceId: input.workspaceId,
        email: invite.email,
        role: invite.role,
        invitedById: input.actorId,
        expiresAt
      }))
    )

    await Promise.all(
      created.map((invitation) => this.queue.enqueueNotify(invitation.id))
    )

    return { data: created, errors }
  }
}
