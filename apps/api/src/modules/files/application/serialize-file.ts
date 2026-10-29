import type { FilePublic, FileRecord } from '../domain/file.record'

export function serializeFile(file: FileRecord): FilePublic {
  return {
    id: file.id,
    workspaceId: file.workspaceId,
    originalName: file.originalName,
    contentType: file.contentType,
    byteSize: file.byteSize,
    status: file.status,
    messageId: file.messageId,
    postId: file.postId,
    conversationId: file.conversationId,
    createdAt: file.createdAt.toISOString(),
    uploadedAt: file.uploadedAt?.toISOString() ?? null,
    uploader: file.uploader
  }
}
