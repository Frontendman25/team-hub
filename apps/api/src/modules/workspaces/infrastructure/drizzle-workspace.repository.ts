import { Injectable } from '@nestjs/common'
import { and, count, eq, ne, sql } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { users } from '../../../infrastructure/database/schema/users'
import { conversations } from '../../../infrastructure/database/schema/messaging'
import {
  workspaceInvitations,
  workspaceMembers,
  workspaces
} from '../../../infrastructure/database/schema/workspaces'
import type {
  InvitationStatus,
  InviteRole,
  WorkspaceRole
} from '../domain/roles'
import type { WorkspaceKind } from '../../demo/demo.constants'
import type {
  AccountRecord,
  InvitationRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
  WorkspaceRepository,
  WorkspaceSummary
} from '../domain/workspace.repository'

function toWorkspace(row: {
  id: string
  name: string
  slug: string
  description: string
  createdById: string
  kind: string
  createdAt: Date
  updatedAt: Date
}): WorkspaceRecord {
  return { ...row, kind: row.kind as WorkspaceKind }
}

@Injectable()
export class DrizzleWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Database) {}

  async create(data: {
    name: string
    slug: string
    description: string
    createdById: string
  }): Promise<WorkspaceRecord> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(workspaces).values(data).returning()
      if (!created) {
        throw new Error('Workspace insert did not return a row')
      }
      await tx.insert(workspaceMembers).values({
        workspaceId: created.id,
        userId: data.createdById,
        role: 'owner'
      })
      await tx.insert(conversations).values({
        workspaceId: created.id,
        type: 'channel',
        name: 'general',
        slug: 'general',
        topic: 'Workspace-wide conversation',
        createdById: data.createdById
      })
      return toWorkspace(created)
    })
  }

  async findById(id: string): Promise<WorkspaceRecord | null> {
    const [row] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
    return row ? toWorkspace(row) : null
  }

  async findBySlug(slug: string): Promise<WorkspaceRecord | null> {
    const [row] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
    return row ? toWorkspace(row) : null
  }

  async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        exceptId
          ? and(eq(workspaces.slug, slug), ne(workspaces.id, exceptId))
          : eq(workspaces.slug, slug)
      )
    return Boolean(row)
  }

  async listForUser(userId: string): Promise<WorkspaceSummary[]> {
    const rows = await this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        description: workspaces.description,
        createdById: workspaces.createdById,
        kind: workspaces.kind,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: workspaceMembers.role,
        memberCount: sql<number>`cast((
          select count(*) from ${workspaceMembers} as m
          where m.workspace_id = ${workspaces.id}
        ) as int)`
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(workspaces.name)

    return rows.map((row) => ({
      ...row,
      kind: row.kind as WorkspaceSummary['kind'],
      role: row.role as WorkspaceRole,
      memberCount: Number(row.memberCount)
    }))
  }

  async update(
    id: string,
    data: { name?: string; description?: string; slug?: string }
  ): Promise<WorkspaceRecord | null> {
    const [updated] = await this.db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning()
    return updated ? toWorkspace(updated) : null
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(workspaces)
      .where(eq(workspaces.id, id))
      .returning({ id: workspaces.id })
    return deleted.length > 0
  }

  async getMembership(
    workspaceId: string,
    userId: string
  ): Promise<{ role: WorkspaceRole } | null> {
    const [row] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
    return row ? { role: row.role as WorkspaceRole } : null
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    const rows = await this.db
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        createdAt: workspaceMembers.createdAt,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl,
        email: users.email,
        accountKind: users.accountKind
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .innerJoin(profiles, eq(profiles.userId, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(workspaceMembers.createdAt)

    return rows.map((row) => ({
      ...row,
      role: row.role as WorkspaceRole,
      accountKind: row.accountKind as WorkspaceMemberRecord['accountKind'],
      email: row.accountKind === 'guest' ? '' : row.email
    }))
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void> {
    await this.db
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role })
      .onConflictDoNothing()
  }

  async updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<boolean> {
    const updated = await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning({ userId: workspaceMembers.userId })
    return updated.length > 0
  }

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning({ userId: workspaceMembers.userId })
    return deleted.length > 0
  }

  async countByRole(workspaceId: string, role: WorkspaceRole): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.role, role)
        )
      )
    return Number(row?.value ?? 0)
  }

  async transferOwnership(data: {
    workspaceId: string
    fromUserId: string
    toUserId: string
  }): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, data.workspaceId),
            eq(workspaceMembers.userId, data.toUserId)
          )
        )
      if (!target) {
        return false
      }

      await tx
        .update(workspaceMembers)
        .set({ role: 'admin' })
        .where(
          and(
            eq(workspaceMembers.workspaceId, data.workspaceId),
            eq(workspaceMembers.userId, data.fromUserId)
          )
        )
      await tx
        .update(workspaceMembers)
        .set({ role: 'owner' })
        .where(
          and(
            eq(workspaceMembers.workspaceId, data.workspaceId),
            eq(workspaceMembers.userId, data.toUserId)
          )
        )
      return true
    })
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
    return row?.id ?? null
  }

  async findEmailById(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
    return row?.email ?? null
  }

  async findAccount(userId: string): Promise<AccountRecord | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        accountKind: users.accountKind,
        guestExpiresAt: users.guestExpiresAt
      })
      .from(users)
      .where(eq(users.id, userId))
    if (!row) {
      return null
    }
    return {
      id: row.id,
      accountKind: row.accountKind as AccountRecord['accountKind'],
      guestExpiresAt: row.guestExpiresAt
    }
  }

  async createInvitations(
    rows: {
      workspaceId: string
      email: string
      role: InviteRole
      invitedById: string
      expiresAt: Date
    }[]
  ): Promise<InvitationRecord[]> {
    if (rows.length === 0) {
      return []
    }
    const inserted = await this.db
      .insert(workspaceInvitations)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: workspaceInvitations.id })

    const records: InvitationRecord[] = []
    for (const row of inserted) {
      const invitation = await this.findInvitationById(row.id)
      if (invitation) {
        records.push(invitation)
      }
    }
    return records
  }

  async listInvitations(workspaceId: string): Promise<InvitationRecord[]> {
    const rows = await this.invitationQuery().where(
      eq(workspaceInvitations.workspaceId, workspaceId)
    )
    return rows.map((row) => this.toInvitation(row))
  }

  async findInvitationById(id: string): Promise<InvitationRecord | null> {
    const [row] = await this.invitationQuery().where(
      eq(workspaceInvitations.id, id)
    )
    return row ? this.toInvitation(row) : null
  }

  async listPendingForEmail(email: string): Promise<InvitationRecord[]> {
    const rows = await this.invitationQuery().where(
      and(
        eq(workspaceInvitations.email, email),
        eq(workspaceInvitations.status, 'pending')
      )
    )
    return rows.map((row) => this.toInvitation(row))
  }

  async setInvitationStatus(
    id: string,
    status: InvitationStatus
  ): Promise<boolean> {
    const updated = await this.db
      .update(workspaceInvitations)
      .set({ status })
      .where(eq(workspaceInvitations.id, id))
      .returning({ id: workspaceInvitations.id })
    return updated.length > 0
  }

  async acceptInvitation(input: {
    invitationId: string
    workspaceId: string
    userId: string
    role: WorkspaceRole
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [pending] = await tx
        .select({ id: workspaceInvitations.id })
        .from(workspaceInvitations)
        .where(
          and(
            eq(workspaceInvitations.id, input.invitationId),
            eq(workspaceInvitations.status, 'pending')
          )
        )
      if (!pending) {
        return
      }
      await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role
        })
        .onConflictDoNothing()
      await tx
        .update(workspaceInvitations)
        .set({ status: 'accepted' })
        .where(eq(workspaceInvitations.id, input.invitationId))
    })
  }

  private invitationQuery() {
    return this.db
      .select({
        id: workspaceInvitations.id,
        workspaceId: workspaceInvitations.workspaceId,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        email: workspaceInvitations.email,
        role: workspaceInvitations.role,
        invitedById: workspaceInvitations.invitedById,
        invitedByName: profiles.displayName,
        status: workspaceInvitations.status,
        expiresAt: workspaceInvitations.expiresAt,
        createdAt: workspaceInvitations.createdAt
      })
      .from(workspaceInvitations)
      .innerJoin(
        workspaces,
        eq(workspaces.id, workspaceInvitations.workspaceId)
      )
      .innerJoin(
        profiles,
        eq(profiles.userId, workspaceInvitations.invitedById)
      )
  }

  private toInvitation(row: {
    id: string
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
    email: string
    role: string
    invitedById: string
    invitedByName: string
    status: string
    expiresAt: Date
    createdAt: Date
  }): InvitationRecord {
    return {
      ...row,
      role: row.role as InviteRole,
      status: row.status as InvitationStatus
    }
  }
}
