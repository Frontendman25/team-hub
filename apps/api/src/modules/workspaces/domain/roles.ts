export const workspaceRoles = ['owner', 'admin', 'member'] as const
export type WorkspaceRole = (typeof workspaceRoles)[number]

export const inviteRoles = ['admin', 'member'] as const
export type InviteRole = (typeof inviteRoles)[number]

export const invitationStatuses = [
  'pending',
  'accepted',
  'declined',
  'revoked'
] as const
export type InvitationStatus = (typeof invitationStatuses)[number]

const rank: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3
}

export function hasAtLeast(
  role: WorkspaceRole,
  minimum: WorkspaceRole
): boolean {
  return rank[role] >= rank[minimum]
}

export function canManageRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  if (targetRole === 'owner') {
    return false
  }
  return hasAtLeast(actorRole, 'admin')
}
