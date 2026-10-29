import type { TaskPriority, TaskStatus } from '../tasks.constants'

export type TaskPerson = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type TaskRecord = {
  id: string
  workspaceId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  position: number
  assigneeId: string | null
  dueDate: string | null
  createdBy: string
  version: number
  createdAt: Date
  updatedAt: Date
  creator: TaskPerson
  assignee: TaskPerson | null
}
