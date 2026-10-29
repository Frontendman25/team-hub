import { z } from 'zod'

export const POST_CONTENT_MAX = 5000

export const createPostSchema = z
  .object({
    workspaceId: z.string().uuid(),
    content: z.string().trim().max(POST_CONTENT_MAX).default(''),
    imageUrl: z.string().trim().max(2000).nullable().optional(),
    imageAlt: z.string().trim().max(200).nullable().optional(),
    attachmentIds: z.array(z.string().uuid()).max(5).default([])
  })
  .refine(
    (value) =>
      value.content.length > 0 ||
      value.attachmentIds.length > 0 ||
      Boolean(value.imageUrl),
    { message: 'Post cannot be empty' }
  )

export const updatePostSchema = z
  .object({
    content: z.string().trim().min(1).max(POST_CONTENT_MAX).optional(),
    imageUrl: z.string().trim().max(2000).nullable().optional(),
    imageAlt: z.string().trim().max(200).nullable().optional()
  })
  .refine(
    (value) =>
      value.content !== undefined ||
      value.imageUrl !== undefined ||
      value.imageAlt !== undefined,
    { message: 'At least one field is required' }
  )

export const listPostsQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  authorId: z.string().uuid().optional()
})

export type CreatePostBody = z.infer<typeof createPostSchema>
export type UpdatePostBody = z.infer<typeof updatePostSchema>
export type ListPostsQueryDto = z.infer<typeof listPostsQuerySchema>
