import { z } from 'zod'

export const registerBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(2000).optional()
})

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72)
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
