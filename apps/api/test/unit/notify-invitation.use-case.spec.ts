import { describe, expect, it, vi } from 'vitest'
import { CreateNotificationUseCase } from '../../src/modules/notifications/application/create-notification.use-case'
import { NotifyInvitationUseCase } from '../../src/modules/workspaces/application/notify-invitation.use-case'
import type { WorkspaceRepository } from '../../src/modules/workspaces/domain/workspace.repository'

const invitationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const workspaceId = '88888888-8888-4888-8888-888888888888'
const james = '22222222-2222-4222-8222-222222222222'
const sarah = '11111111-1111-4111-8111-111111111111'

function pendingInvite() {
  return {
    id: invitationId,
    workspaceId,
    workspaceName: 'Invite Lab',
    workspaceSlug: 'invite-lab',
    email: 'james.parker@teamhub.local',
    role: 'member' as const,
    invitedById: sarah,
    invitedByName: 'Sarah Chen',
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date()
  }
}

describe('NotifyInvitationUseCase', () => {
  it('creates an invitation notification for a registered invitee', async () => {
    const workspaces = {
      findInvitationById: vi.fn().mockResolvedValue(pendingInvite()),
      findUserIdByEmail: vi.fn().mockResolvedValue(james)
    } as unknown as WorkspaceRepository
    const notify = {
      execute: vi.fn().mockResolvedValue(undefined)
    } as unknown as CreateNotificationUseCase

    await new NotifyInvitationUseCase(workspaces, notify).execute(invitationId)

    expect(notify.execute).toHaveBeenCalledWith({
      recipientId: james,
      actorId: sarah,
      type: 'invitation',
      workspaceId,
      invitationId
    })
  })

  it('is a no-op for accepted or missing invitations', async () => {
    const workspaces = {
      findInvitationById: vi.fn().mockResolvedValue({
        ...pendingInvite(),
        status: 'accepted'
      }),
      findUserIdByEmail: vi.fn()
    } as unknown as WorkspaceRepository
    const notify = {
      execute: vi.fn()
    } as unknown as CreateNotificationUseCase

    await new NotifyInvitationUseCase(workspaces, notify).execute(invitationId)

    expect(notify.execute).not.toHaveBeenCalled()
    expect(workspaces.findUserIdByEmail).not.toHaveBeenCalled()
  })
})
