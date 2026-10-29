import type { ConversationRecord, MessageRecord } from '../domain/types'

export function serializeMessage(message: MessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    authorId: message.authorId,
    content: message.content,
    clientId: message.clientId,
    editedAt: message.editedAt?.toISOString() ?? null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
    attachments: message.attachments ?? []
  }
}

export function serializeConversation(conversation: ConversationRecord) {
  return {
    id: conversation.id,
    workspaceId: conversation.workspaceId,
    type: conversation.type,
    name: conversation.name,
    slug: conversation.slug,
    topic: conversation.topic,
    createdById: conversation.createdById,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    unreadCount: conversation.unreadCount,
    lastMessage: conversation.lastMessage
      ? {
          id: conversation.lastMessage.id,
          content: conversation.lastMessage.deleted
            ? 'This message was deleted'
            : conversation.lastMessage.content,
          createdAt: conversation.lastMessage.createdAt.toISOString(),
          authorId: conversation.lastMessage.authorId,
          authorName: conversation.lastMessage.authorName,
          deleted: conversation.lastMessage.deleted
        }
      : null,
    peer: conversation.peer
  }
}

export type SerializedMessage = ReturnType<typeof serializeMessage>
export type SerializedConversation = ReturnType<typeof serializeConversation>
