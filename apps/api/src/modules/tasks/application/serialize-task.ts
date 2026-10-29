import type { TaskRecord } from '../domain/task.record'

export function serializeTask(task: TaskRecord) {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    position: task.position,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    createdBy: task.createdBy,
    version: task.version,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    creator: task.creator,
    assignee: task.assignee
  }
}

export type SerializedTask = ReturnType<typeof serializeTask>
