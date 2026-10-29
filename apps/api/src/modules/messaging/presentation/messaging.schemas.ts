import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const createChannelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  topic: z.string().trim().max(500).optional()
})

export const updateChannelSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    topic: z.string().trim().max(500).optional()
  })
  .refine((value) => value.name !== undefined || value.topic !== undefined, {
    message: 'At least one field is required'
  })

export const openDmSchema = z.object({
  userId: z.string().uuid()
})

export const sendMessageSchema = z
  .object({
    content: z.string().trim().max(4000).default(''),
    clientId: z.string().uuid(),
    attachmentIds: z.array(z.string().uuid()).max(5).default([])
  })
  .refine(
    (value) => value.content.length > 0 || value.attachmentIds.length > 0,
    {
      message: 'Message cannot be empty'
    }
  )

export const editMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000)
})

export const listMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(30)
})

export const joinWorkspaceSchema = z.object({
  workspaceId: z.string().uuid()
})

export const joinConversationSchema = z.object({
  conversationId: z.string().uuid()
})

export const socketSendSchema = z
  .object({
    conversationId: z.string().uuid(),
    content: z.string().trim().max(4000).default(''),
    clientId: z.string().uuid(),
    attachmentIds: z.array(z.string().uuid()).max(5).default([])
  })
  .refine(
    (value) => value.content.length > 0 || value.attachmentIds.length > 0,
    {
      message: 'Message cannot be empty'
    }
  )

export const socketEditSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000)
})

export const socketMessageIdSchema = z.object({
  messageId: z.string().uuid()
})

export const socketTypingSchema = z.object({
  conversationId: z.string().uuid()
})

export type CreateChannelBody = z.infer<typeof createChannelSchema>
export type UpdateChannelBody = z.infer<typeof updateChannelSchema>
export type OpenDmBody = z.infer<typeof openDmSchema>
export type SendMessageBody = z.infer<typeof sendMessageSchema>
export type EditMessageBody = z.infer<typeof editMessageSchema>
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>
