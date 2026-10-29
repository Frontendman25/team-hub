export type Author = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type FileAttachment = {
  id: string
  workspaceId: string
  originalName: string
  contentType: string
  byteSize: number
  status: 'pending' | 'ready' | 'failed' | 'deleted'
  messageId: string | null
  postId: string | null
  conversationId: string | null
  createdAt: string
  uploadedAt: string | null
  uploader: Author
  previewUrl?: string
}

export type WorkspaceFile = FileAttachment & {
  source: {
    kind: 'post' | 'message'
    id: string
    label: string
    href: string
  } | null
}

export type PaginatedFiles = {
  data: WorkspaceFile[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export type Post = {
  id: string
  workspaceId: string
  authorId: string
  content: string
  imageUrl: string | null
  imageAlt: string | null
  createdAt: string
  updatedAt: string
  commentsCount: number
  reactionsCount: number
  viewerHasReacted: boolean
  author: Author
  attachments?: FileAttachment[]
}

export type PaginatedPosts = {
  data: Post[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export type Comment = {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: string
  updatedAt: string
  author: Author
}

export type AccountKind = 'registered' | 'guest' | 'demo_persona'
export type WorkspaceKind = 'private' | 'demo'

export type PublicUser = {
  id: string
  email: string
  displayName: string
  jobTitle: string
  bio: string
  avatarUrl: string | null
  createdAt: string
  accountKind?: AccountKind
  guestExpiresAt?: string | null
}

export type FeedStats = {
  users: number
  posts: number
  comments: number
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export type Workspace = {
  id: string
  name: string
  slug: string
  description: string
  createdById: string
  kind?: WorkspaceKind
  createdAt: string
  updatedAt: string
  role?: WorkspaceRole
  memberCount?: number
}

export type WorkspaceMember = {
  userId: string
  role: WorkspaceRole
  createdAt: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
  email: string
  accountKind?: AccountKind
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  workspaceId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  position: number
  assigneeId: string | null
  dueDate: string | null
  createdBy: string
  version: number
  createdAt: string
  updatedAt: string
  creator: Author
  assignee: Author | null
}

export type WorkspaceInvitation = {
  id: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  invitedById: string
  invitedByName: string
  status: 'pending' | 'accepted' | 'declined' | 'revoked'
  expiresAt: string
  createdAt: string
}

export type NotificationType = 'comment' | 'reaction' | 'invitation'

export type AppNotification = {
  id: string
  type: NotificationType
  postId: string | null
  commentId: string | null
  workspaceId: string | null
  invitationId: string | null
  workspaceSlug: string | null
  workspaceName: string | null
  readAt: string | null
  createdAt: string
  postDeleted: boolean
  postPreview: string | null
  actor: Author
}

export type NotificationList = {
  data: AppNotification[]
}

export type UnreadCount = {
  count: number
}

export type ConversationType = 'channel' | 'dm'

export type ConversationLastMessage = {
  id: string
  content: string
  createdAt: string
  authorId: string
  authorName: string
  deleted: boolean
}

export type Conversation = {
  id: string
  workspaceId: string
  type: ConversationType
  name: string | null
  slug: string | null
  topic: string
  createdById: string
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
  unreadCount: number
  lastMessage: ConversationLastMessage | null
  peer: Author | null
}

export type ChatMessage = {
  id: string
  conversationId: string
  authorId: string
  content: string
  clientId: string
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  author: Author
  attachments?: FileAttachment[]
  pending?: boolean
  failed?: boolean
}

export type MessagePage = {
  data: ChatMessage[]
  nextCursor: string | null
}

export type SearchKind = 'person' | 'channel' | 'post' | 'message'

export type SearchHit = {
  kind: SearchKind
  id: string
  title: string
  snippet: string
  rank: number
  href: string
  conversationId: string | null
  authorName: string | null
}

export type SearchPage = {
  data: SearchHit[]
}
