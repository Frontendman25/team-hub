import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional()
})

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).optional()
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined,
    { message: 'At least one field is required' }
  )

export const changeRoleSchema = z.object({
  role: z.enum(['admin', 'member'])
})

export const transferSchema = z.object({
  userId: z.string().uuid()
})

export const inviteRowSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['admin', 'member']).default('member')
})

export const createInvitationsSchema = z.object({
  invites: z.array(inviteRowSchema).min(1).max(10)
})

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceSchema>
export type ChangeRoleBody = z.infer<typeof changeRoleSchema>
export type TransferBody = z.infer<typeof transferSchema>
export type CreateInvitationsBody = z.infer<typeof createInvitationsSchema>
