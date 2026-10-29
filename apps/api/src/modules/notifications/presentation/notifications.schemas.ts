import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

export type ListNotificationsQueryDto = z.infer<
  typeof listNotificationsQuerySchema
>
