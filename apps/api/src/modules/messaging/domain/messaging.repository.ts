import type { MessageCursor } from '../../../infrastructure/realtime/cursor'
import type {
  ConversationRecord,
  ConversationRow,
  MessageRecord
} from './types'

export type CreateChannelData = {
  workspaceId: string
  name: string
  slug: string
  topic: string
  createdById: string
}

export type CreateDmData = {
  workspaceId: string
  dmKey: string
  createdById: string
  memberIds: [string, string]
}

export type InsertMessageData = {
  conversationId: string
  workspaceId: string
  authorId: string
  content: string
  clientId: string
  attachmentIds?: string[]
}

export interface MessagingRepository {
  createChannel(data: CreateChannelData): Promise<ConversationRecord>
  updateChannel(
    id: string,
    data: { name?: string; topic?: string; slug?: string }
  ): Promise<ConversationRecord | null>
  channelSlugTaken(
    workspaceId: string,
    slug: string,
    exceptId?: string
  ): Promise<boolean>
  findConversation(id: string): Promise<ConversationRow | null>
  findDm(workspaceId: string, dmKey: string): Promise<ConversationRow | null>
  getOrCreateDm(data: CreateDmData): Promise<ConversationRow>
  listForUser(
    workspaceId: string,
    userId: string
  ): Promise<ConversationRecord[]>
  summarize(id: string, userId: string): Promise<ConversationRecord | null>
  insertMessage(data: InsertMessageData): Promise<{
    message: MessageRecord
    duplicate: boolean
  }>
  listMessages(input: {
    conversationId: string
    cursor?: MessageCursor
    limit: number
  }): Promise<{ items: MessageRecord[]; nextCursor: string | null }>
  searchMessages(input: {
    workspaceId: string
    userId: string
    query: string
    limit: number
  }): Promise<MessageRecord[]>
  findMessage(id: string): Promise<MessageRecord | null>
  updateMessageContent(
    id: string,
    content: string
  ): Promise<MessageRecord | null>
  softDeleteMessage(id: string): Promise<MessageRecord | null>
  markRead(conversationId: string, userId: string, at: Date): Promise<void>
  isDmMember(conversationId: string, userId: string): Promise<boolean>
  listMemberIds(conversationId: string): Promise<string[]>
}
