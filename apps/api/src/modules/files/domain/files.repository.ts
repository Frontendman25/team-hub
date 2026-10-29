import type { FileRecord } from './file.record'

export type CreatePendingFileData = {
  id: string
  workspaceId: string
  uploadedBy: string
  originalName: string
  contentType: string
  byteSize: number
  objectKey: string
}

export type AttachFilesData = {
  workspaceId: string
  actorId: string
  fileIds: string[]
  messageId?: string
  postId?: string
}

export interface FilesRepository {
  createPending(data: CreatePendingFileData): Promise<FileRecord>
  findById(id: string): Promise<FileRecord | null>
  findByIds(ids: string[]): Promise<FileRecord[]>
  markReady(id: string, uploadedAt: Date): Promise<FileRecord | null>
  markFailed(id: string): Promise<void>
  markDeleted(id: string): Promise<FileRecord | null>
  workspaceUsageBytes(workspaceId: string): Promise<number>
  countActiveByUploader(userId: string): Promise<number>
  listByMessageIds(messageIds: string[]): Promise<Map<string, FileRecord[]>>
  listByPostIds(postIds: string[]): Promise<Map<string, FileRecord[]>>
  listWorkspace(input: {
    workspaceId: string
    actorId: string
    limit: number
    offset: number
  }): Promise<{ items: FileRecord[]; total: number }>
  attachReadyFiles(data: AttachFilesData): Promise<number>
  isConversationMember(conversationId: string, userId: string): Promise<boolean>
}
