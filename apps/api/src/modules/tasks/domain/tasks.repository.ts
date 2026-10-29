import type { TaskPriority, TaskStatus } from '../tasks.constants'
import type { TaskRecord } from './task.record'

export type CreateTaskData = {
  workspaceId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  dueDate: string | null
  createdBy: string
}

export type UpdateTaskData = {
  title?: string
  description?: string
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  expectedVersion: number
}

export type ListTasksQuery = {
  workspaceId: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
}

export type MoveResult =
  | { ok: true; task: TaskRecord; board: TaskRecord[] }
  | { ok: false; reason: 'not_found' | 'stale' }

export type UpdateResult =
  { ok: true; task: TaskRecord } | { ok: false; reason: 'not_found' | 'stale' }

export interface TasksRepository {
  list(query: ListTasksQuery): Promise<TaskRecord[]>
  findById(id: string): Promise<TaskRecord | null>
  create(data: CreateTaskData): Promise<TaskRecord>
  update(id: string, data: UpdateTaskData): Promise<UpdateResult>
  move(
    id: string,
    status: TaskStatus,
    position: number,
    expectedVersion: number
  ): Promise<MoveResult>
  delete(id: string): Promise<boolean>
}
