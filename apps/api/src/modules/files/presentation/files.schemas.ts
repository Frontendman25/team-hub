import { z } from 'zod'

export const initiateUploadSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(127),
  byteSize: z.number().int().positive()
})

export const listFilesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  offset: z.coerce.number().int().min(0).default(0)
})

export type InitiateUploadBody = z.infer<typeof initiateUploadSchema>
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>
