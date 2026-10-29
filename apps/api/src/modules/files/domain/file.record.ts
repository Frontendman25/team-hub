export type FileStatus = 'pending' | 'ready' | 'failed' | 'deleted'

export type FileUploader = {
  id: string
  displayName: string
  jobTitle: string
  avatarUrl: string | null
}

export type FileRecord = {
  id: string
  workspaceId: string
  uploadedBy: string
  originalName: string
  contentType: string
  byteSize: number
  objectKey: string
  status: FileStatus
  messageId: string | null
  postId: string | null
  conversationId: string | null
  conversationType: string | null
  createdAt: Date
  uploadedAt: Date | null
  deletedAt: Date | null
  uploader: FileUploader
}

export type FilePublic = {
  id: string
  workspaceId: string
  originalName: string
  contentType: string
  byteSize: number
  status: FileStatus
  messageId: string | null
  postId: string | null
  conversationId: string | null
  createdAt: string
  uploadedAt: string | null
  uploader: FileUploader
}
