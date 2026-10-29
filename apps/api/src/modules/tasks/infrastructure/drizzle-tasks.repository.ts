import { Injectable } from '@nestjs/common'
import { and, asc, eq, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { tasks } from '../../../infrastructure/database/schema/tasks'
import { workspaces } from '../../../infrastructure/database/schema/workspaces'
import type { TaskPriority, TaskStatus } from '../tasks.constants'
import type { TaskPerson, TaskRecord } from '../domain/task.record'
import type {
  CreateTaskData,
  ListTasksQuery,
  MoveResult,
  TasksRepository,
  UpdateResult,
  UpdateTaskData
} from '../domain/tasks.repository'

const creatorProfiles = alias(profiles, 'task_creator_profiles')
const assigneeProfiles = alias(profiles, 'task_assignee_profiles')

type TaskRow = {
  id: string
  workspaceId: string
  title: string
  description: string
  status: string
  priority: string
  position: number
  assigneeId: string | null
  dueDate: string | null
  createdBy: string
  version: number
  createdAt: Date
  updatedAt: Date
  creatorName: string | null
  creatorTitle: string | null
  creatorAvatar: string | null
  assigneeName: string | null
  assigneeTitle: string | null
  assigneeAvatar: string | null
}

@Injectable()
export class DrizzleTasksRepository implements TasksRepository {
  constructor(private readonly db: Database) {}

  async list(query: ListTasksQuery): Promise<TaskRecord[]> {
    const filters: SQL[] = [eq(tasks.workspaceId, query.workspaceId)]
    if (query.status) {
      filters.push(eq(tasks.status, query.status))
    }
    if (query.priority) {
      filters.push(eq(tasks.priority, query.priority))
    }
    if (query.assigneeId === null) {
      filters.push(sql`${tasks.assigneeId} is null`)
    } else if (query.assigneeId) {
      filters.push(eq(tasks.assigneeId, query.assigneeId))
    }
    const rows = await this.baseQuery()
      .where(and(...filters))
      .orderBy(asc(tasks.status), asc(tasks.position))
    return rows.map((row) => this.toRecord(row))
  }

  async findById(id: string): Promise<TaskRecord | null> {
    const [row] = await this.baseQuery().where(eq(tasks.id, id))
    return row ? this.toRecord(row) : null
  }

  async create(data: CreateTaskData): Promise<TaskRecord> {
    const created = await this.db.transaction(async (tx) => {
      await this.lockWorkspace(tx, data.workspaceId)
      const [maxRow] = await tx
        .select({
          max: sql<number>`coalesce(max(${tasks.position}), -1)`
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, data.workspaceId),
            eq(tasks.status, data.status)
          )
        )
      const position = (maxRow?.max ?? -1) + 1
      const [row] = await tx
        .insert(tasks)
        .values({
          workspaceId: data.workspaceId,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          position,
          assigneeId: data.assigneeId,
          dueDate: data.dueDate,
          createdBy: data.createdBy
        })
        .returning({ id: tasks.id })
      if (!row) {
        throw new Error('Task insert did not return an id')
      }
      return row.id
    })
    const record = await this.findById(created)
    if (!record) {
      throw new Error('Task was created but could not be loaded')
    }
    return record
  }

  async update(id: string, data: UpdateTaskData): Promise<UpdateResult> {
    const outcome = await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .for('update')
      if (!current) {
        return { ok: false as const, reason: 'not_found' as const }
      }
      if (current.version !== data.expectedVersion) {
        return { ok: false as const, reason: 'stale' as const }
      }
      await tx
        .update(tasks)
        .set({
          title: data.title ?? current.title,
          description: data.description ?? current.description,
          priority: data.priority ?? current.priority,
          assigneeId:
            data.assigneeId === undefined
              ? current.assigneeId
              : data.assigneeId,
          dueDate: data.dueDate === undefined ? current.dueDate : data.dueDate,
          version: current.version + 1,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, id))
      return { ok: true as const }
    })
    if (!outcome.ok) {
      return outcome
    }
    const task = await this.findById(id)
    if (!task) {
      return { ok: false, reason: 'not_found' }
    }
    return { ok: true, task }
  }

  async move(
    id: string,
    status: TaskStatus,
    position: number,
    expectedVersion: number
  ): Promise<MoveResult> {
    const outcome = await this.db.transaction(async (tx) => {
      const [peek] = await tx.select().from(tasks).where(eq(tasks.id, id))
      if (!peek) {
        return { ok: false as const, reason: 'not_found' as const }
      }
      await this.lockWorkspace(tx, peek.workspaceId)
      const [current] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .for('update')
      if (!current) {
        return { ok: false as const, reason: 'not_found' as const }
      }
      if (current.version !== expectedVersion) {
        return { ok: false as const, reason: 'stale' as const }
      }

      const sourceStatus = current.status as TaskStatus
      const sourceRows = await this.lockColumn(
        tx,
        current.workspaceId,
        sourceStatus
      )
      const destRows =
        sourceStatus === status
          ? sourceRows
          : await this.lockColumn(tx, current.workspaceId, status)

      const without = destRows.filter((row) => row.id !== id)
      const clamped = Math.max(0, Math.min(position, without.length))
      const nextDest = [...without]
      nextDest.splice(clamped, 0, { ...current, status, position: clamped })

      const nextSource =
        sourceStatus === status
          ? nextDest
          : sourceRows.filter((row) => row.id !== id)

      await this.writePositions(tx, nextSource, sourceStatus)
      if (sourceStatus !== status) {
        await this.writePositions(tx, nextDest, status)
      }

      await tx
        .update(tasks)
        .set({
          status,
          version: current.version + 1,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, id))

      return { ok: true as const, workspaceId: current.workspaceId }
    })
    if (!outcome.ok) {
      return outcome
    }
    const task = await this.findById(id)
    const board = await this.list({ workspaceId: outcome.workspaceId })
    if (!task) {
      return { ok: false, reason: 'not_found' }
    }
    return { ok: true, task, board }
  }

  async delete(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [peek] = await tx.select().from(tasks).where(eq(tasks.id, id))
      if (!peek) {
        return false
      }
      await this.lockWorkspace(tx, peek.workspaceId)
      const [current] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .for('update')
      if (!current) {
        return false
      }
      await tx.delete(tasks).where(eq(tasks.id, id))
      const remaining = await this.lockColumn(
        tx,
        current.workspaceId,
        current.status as TaskStatus
      )
      await this.writePositions(tx, remaining, current.status as TaskStatus)
      return true
    })
  }

  private async lockWorkspace(
    tx: Database,
    workspaceId: string
  ): Promise<void> {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .for('update')
  }

  private async lockColumn(
    tx: Database,
    workspaceId: string,
    status: TaskStatus
  ) {
    return tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, status)))
      .orderBy(asc(tasks.position))
      .for('update')
  }

  private async writePositions(
    tx: Database,
    rows: { id: string }[],
    status: TaskStatus
  ): Promise<void> {
    for (const [index, row] of rows.entries()) {
      await tx
        .update(tasks)
        .set({
          status,
          position: index,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, row.id))
    }
  }

  private baseQuery() {
    return this.db
      .select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        position: tasks.position,
        assigneeId: tasks.assigneeId,
        dueDate: tasks.dueDate,
        createdBy: tasks.createdBy,
        version: tasks.version,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        creatorName: creatorProfiles.displayName,
        creatorTitle: creatorProfiles.jobTitle,
        creatorAvatar: creatorProfiles.avatarUrl,
        assigneeName: assigneeProfiles.displayName,
        assigneeTitle: assigneeProfiles.jobTitle,
        assigneeAvatar: assigneeProfiles.avatarUrl
      })
      .from(tasks)
      .innerJoin(creatorProfiles, eq(creatorProfiles.userId, tasks.createdBy))
      .leftJoin(assigneeProfiles, eq(assigneeProfiles.userId, tasks.assigneeId))
  }

  private toRecord(row: TaskRow): TaskRecord {
    const creator: TaskPerson = {
      id: row.createdBy,
      displayName: row.creatorName ?? 'Unknown',
      jobTitle: row.creatorTitle ?? '',
      avatarUrl: row.creatorAvatar
    }
    const assignee: TaskPerson | null = row.assigneeId
      ? {
          id: row.assigneeId,
          displayName: row.assigneeName ?? 'Unknown',
          jobTitle: row.assigneeTitle ?? '',
          avatarUrl: row.assigneeAvatar
        }
      : null
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      position: row.position,
      assigneeId: row.assigneeId,
      dueDate: row.dueDate,
      createdBy: row.createdBy,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      creator,
      assignee
    }
  }
}
