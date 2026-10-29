import type { AccountKind, WorkspaceKind } from '../../demo/demo.constants'
import type { InvitationStatus, InviteRole, WorkspaceRole } from './roles'

export type WorkspaceRecord = {
  id: string
  name: string
  slug: string
  description: string
  createdById: string
  kind: WorkspaceKind
  createdAt: Date
  updatedAt: Date
}

export type WorkspaceSummary = WorkspaceRecord & {
  role: WorkspaceRole
  memberCount: number
}

export type WorkspaceMemberRecord = {
  userId: string
  role: WorkspaceRole
  createdAt: Date
  displayName: string
  jobTitle: string
  avatarUrl: string | null
  email: string
  accountKind: AccountKind
}

export type AccountRecord = {
  id: string
  accountKind: AccountKind
  guestExpiresAt: Date | null
}

export type InvitationRecord = {
  id: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  email: string
  role: InviteRole
  invitedById: string
  invitedByName: string
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
}

export interface WorkspaceRepository {
  create(data: {
    name: string
    slug: string
    description: string
    createdById: string
  }): Promise<WorkspaceRecord>
  findById(id: string): Promise<WorkspaceRecord | null>
  findBySlug(slug: string): Promise<WorkspaceRecord | null>
  slugTaken(slug: string, exceptId?: string): Promise<boolean>
  listForUser(userId: string): Promise<WorkspaceSummary[]>
  update(
    id: string,
    data: { name?: string; description?: string; slug?: string }
  ): Promise<WorkspaceRecord | null>
  delete(id: string): Promise<boolean>
  getMembership(
    workspaceId: string,
    userId: string
  ): Promise<{ role: WorkspaceRole } | null>
  listMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]>
  addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void>
  updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<boolean>
  removeMember(workspaceId: string, userId: string): Promise<boolean>
  countByRole(workspaceId: string, role: WorkspaceRole): Promise<number>
  transferOwnership(data: {
    workspaceId: string
    fromUserId: string
    toUserId: string
  }): Promise<boolean>
  findUserIdByEmail(email: string): Promise<string | null>
  findEmailById(userId: string): Promise<string | null>
  findAccount(userId: string): Promise<AccountRecord | null>
  createInvitations(
    rows: {
      workspaceId: string
      email: string
      role: InviteRole
      invitedById: string
      expiresAt: Date
    }[]
  ): Promise<InvitationRecord[]>
  listInvitations(workspaceId: string): Promise<InvitationRecord[]>
  findInvitationById(id: string): Promise<InvitationRecord | null>
  listPendingForEmail(email: string): Promise<InvitationRecord[]>
  setInvitationStatus(id: string, status: InvitationStatus): Promise<boolean>
  acceptInvitation(input: {
    invitationId: string
    workspaceId: string
    userId: string
    role: WorkspaceRole
  }): Promise<void>
}
