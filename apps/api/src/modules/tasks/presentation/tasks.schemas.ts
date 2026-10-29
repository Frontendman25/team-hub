import { z } from 'zod'
import {
  TASK_DESCRIPTION_MAX,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX
} from '../tasks.constants'

const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
  .nullable()
  .optional()

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.union([z.literal('unassigned'), z.string().uuid()]).optional()
})

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX),
  description: z.string().max(TASK_DESCRIPTION_MAX).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate
})

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(TASK_TITLE_MAX).optional(),
    description: z.string().max(TASK_DESCRIPTION_MAX).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate,
    version: z.number().int().positive()
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.priority !== undefined ||
      value.assigneeId !== undefined ||
      value.dueDate !== undefined,
    { message: 'Provide at least one field to update' }
  )

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
  position: z.number().int().min(0).max(500),
  version: z.number().int().positive()
})

export type ListTasksQueryDto = z.infer<typeof listTasksQuerySchema>
export type CreateTaskBody = z.infer<typeof createTaskSchema>
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>
export type MoveTaskBody = z.infer<typeof moveTaskSchema>
