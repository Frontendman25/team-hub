import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../src/shared/domain/errors'
import { ChangeMemberRoleUseCase } from '../../src/modules/workspaces/application/change-member-role.use-case'
import type { WorkspaceAccess } from '../../src/modules/workspaces/application/workspace-access'
import type { WorkspaceRepository } from '../../src/modules/workspaces/domain/workspace.repository'

const workspaceId = '88888888-8888-4888-8888-888888888888'
const owner = '11111111-1111-4111-8111-111111111111'
const admin = '22222222-2222-4222-8222-222222222222'
const member = '33333333-3333-4333-8333-333333333333'

describe('ChangeMemberRoleUseCase', () => {
  it('lets an owner promote a member to admin', async () => {
    const workspaces = {
      getMembership: vi.fn().mockResolvedValue({ role: 'member' }),
      updateRole: vi.fn().mockResolvedValue(true)
    } as unknown as WorkspaceRepository
    const access = {
      requireRole: vi.fn().mockResolvedValue({ role: 'owner' })
    } as unknown as WorkspaceAccess

    const demo = { assertNotFrozenDemo: vi.fn().mockResolvedValue(undefined) }
    await new ChangeMemberRoleUseCase(
      workspaces,
      access,
      demo as never
    ).execute({
      workspaceId,
      actorId: owner,
      userId: member,
      role: 'admin'
    })

    expect(workspaces.updateRole).toHaveBeenCalledWith(
      workspaceId,
      member,
      'admin'
    )
  })

  it('forbids an admin from promoting another member', async () => {
    const workspaces = {
      getMembership: vi.fn().mockResolvedValue({ role: 'member' }),
      updateRole: vi.fn()
    } as unknown as WorkspaceRepository
    const access = {
      requireRole: vi.fn().mockResolvedValue({ role: 'admin' })
    } as unknown as WorkspaceAccess

    await expect(
      new ChangeMemberRoleUseCase(workspaces, access, {
        assertNotFrozenDemo: vi.fn().mockResolvedValue(undefined)
      } as never).execute({
        workspaceId,
        actorId: admin,
        userId: member,
        role: 'admin'
      })
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(workspaces.updateRole).not.toHaveBeenCalled()
  })
})
