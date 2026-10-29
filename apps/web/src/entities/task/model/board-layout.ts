import type { Task, TaskPriority, TaskStatus } from '@/shared/types/api'

export const BOARD_COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' }
]

export type BoardFilters = {
  assigneeId: string
  priority: '' | TaskPriority
  status: '' | TaskStatus
}

export function byPosition(a: Task, b: Task): number {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt)
}

export function tasksInColumn(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status).sort(byPosition)
}

export function matchesFilters(task: Task, filters: BoardFilters): boolean {
  if (filters.status && task.status !== filters.status) {
    return false
  }
  if (filters.priority && task.priority !== filters.priority) {
    return false
  }
  if (filters.assigneeId === 'unassigned') {
    return task.assigneeId === null
  }
  if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
    return false
  }
  return true
}

export function applyMove(
  tasks: Task[],
  taskId: string,
  status: TaskStatus,
  index: number
): Task[] {
  const moving = tasks.find((task) => task.id === taskId)
  if (!moving) {
    return tasks
  }
  const remaining = tasks.filter((task) => task.id !== taskId)
  const destination = tasksInColumn(remaining, status)
  const clamped = Math.max(0, Math.min(index, destination.length))
  destination.splice(clamped, 0, moving)
  const nextDest = destination.map((task, position) => ({
    ...task,
    status,
    position
  }))
  if (moving.status === status) {
    return [
      ...remaining.filter((task) => task.status !== status),
      ...nextDest
    ]
  }
  const source = tasksInColumn(remaining, moving.status).map(
    (task, position) => ({
      ...task,
      position
    })
  )
  const untouched = remaining.filter(
    (task) => task.status !== status && task.status !== moving.status
  )
  return [...untouched, ...source, ...nextDest]
}

export function dropIndex(
  columnTasks: Task[],
  overId: string | undefined,
  columnId: string
): number {
  if (!overId || overId === columnId) {
    return columnTasks.length
  }
  const index = columnTasks.findIndex((task) => task.id === overId)
  return index === -1 ? columnTasks.length : index
}
