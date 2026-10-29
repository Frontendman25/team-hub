export type ConversationType = 'channel' | 'dm'

export type MessageAuthor = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type LastMessagePreview = {
  id: string
  content: string
  createdAt: Date
  authorId: string
  authorName: string
  deleted: boolean
}

export type ConversationRecord = {
  id: string
  workspaceId: string
  type: ConversationType
  name: string | null
  slug: string | null
  topic: string
  createdById: string
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
  unreadCount: number
  lastMessage: LastMessagePreview | null
  peer: MessageAuthor | null
}

export type MessageRecord = {
  id: string
  conversationId: string
  authorId: string
  content: string
  clientId: string
  editedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  author: MessageAuthor
  attachments?: import('../../files/domain/file.record').FilePublic[]
}

export type ConversationRow = {
  id: string
  workspaceId: string
  type: string
  name: string | null
  slug: string | null
  topic: string
  dmKey: string | null
  createdById: string
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function dmKeyFor(userA: string, userB: string): string {
  return [userA, userB].sort().join(':')
}
