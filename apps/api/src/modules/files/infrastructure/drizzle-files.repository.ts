import { and, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { files } from '../../../infrastructure/database/schema/files'
import {
  conversationMembers,
  conversations,
  messages
} from '../../../infrastructure/database/schema/messaging'
import { posts } from '../../../infrastructure/database/schema/posts'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import type {
  AttachFilesData,
  CreatePendingFileData,
  FilesRepository
} from '../domain/files.repository'
import type { FileRecord, FileStatus } from '../domain/file.record'

const emptyUploader = {
  displayName: 'Unknown',
  jobTitle: '',
  avatarUrl: null as string | null
}

export class DrizzleFilesRepository implements FilesRepository {
  constructor(private readonly db: Database) {}

  async createPending(data: CreatePendingFileData): Promise<FileRecord> {
    const [created] = await this.db
      .insert(files)
      .values({
        id: data.id,
        workspaceId: data.workspaceId,
        uploadedBy: data.uploadedBy,
        originalName: data.originalName,
        contentType: data.contentType,
        byteSize: data.byteSize,
        objectKey: data.objectKey,
        status: 'pending'
      })
      .returning({ id: files.id })
    if (!created) {
      throw new Error('File insert did not return an id')
    }
    const record = await this.findById(created.id)
    if (!record) {
      throw new Error('File was created but could not be loaded')
    }
    return record
  }

  async findById(id: string): Promise<FileRecord | null> {
    const [row] = await this.baseQuery().where(eq(files.id, id)).limit(1)
    return row ? this.toRecord(row) : null
  }

  async findByIds(ids: string[]): Promise<FileRecord[]> {
    if (ids.length === 0) {
      return []
    }
    const rows = await this.baseQuery().where(inArray(files.id, ids))
    const byId = new Map(rows.map((row) => [row.id, this.toRecord(row)]))
    return ids.flatMap((id) => {
      const row = byId.get(id)
      return row ? [row] : []
    })
  }

  async markReady(id: string, uploadedAt: Date): Promise<FileRecord | null> {
    await this.db
      .update(files)
      .set({ status: 'ready', uploadedAt })
      .where(and(eq(files.id, id), eq(files.status, 'pending')))
    return this.findById(id)
  }

  async markFailed(id: string): Promise<void> {
    await this.db
      .update(files)
      .set({ status: 'failed' })
      .where(and(eq(files.id, id), eq(files.status, 'pending')))
  }

  async markDeleted(id: string): Promise<FileRecord | null> {
    const [updated] = await this.db
      .update(files)
      .set({ status: 'deleted', deletedAt: new Date() })
      .where(and(eq(files.id, id), isNull(files.deletedAt)))
      .returning({ id: files.id })
    return updated ? this.findById(updated.id) : null
  }

  async workspaceUsageBytes(workspaceId: string): Promise<number> {
    const [row] = await this.db
      .select({
        value: sql<number>`coalesce(sum(${files.byteSize}), 0)`
      })
      .from(files)
      .where(
        and(
          eq(files.workspaceId, workspaceId),
          isNull(files.deletedAt),
          inArray(files.status, ['pending', 'ready'])
        )
      )
    return Number(row?.value ?? 0)
  }

  async countActiveByUploader(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(files)
      .where(
        and(
          eq(files.uploadedBy, userId),
          isNull(files.deletedAt),
          inArray(files.status, ['pending', 'ready'])
        )
      )
    return Number(row?.value ?? 0)
  }

  async listByMessageIds(
    messageIds: string[]
  ): Promise<Map<string, FileRecord[]>> {
    return this.groupByParent(messageIds, 'message')
  }

  async listByPostIds(postIds: string[]): Promise<Map<string, FileRecord[]>> {
    return this.groupByParent(postIds, 'post')
  }

  async listWorkspace(input: {
    workspaceId: string
    actorId: string
    limit: number
    offset: number
  }): Promise<{ items: FileRecord[]; total: number }> {
    const visible = this.visibleToMember(input.workspaceId, input.actorId)
    const [totalRow] = await this.db
      .select({ value: count() })
      .from(files)
      .leftJoin(messages, eq(messages.id, files.messageId))
      .leftJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(visible)

    const rows = await this.baseQuery()
      .where(visible)
      .orderBy(desc(files.createdAt), desc(files.id))
      .limit(input.limit)
      .offset(input.offset)

    return {
      items: rows.map((row) => this.toRecord(row)),
      total: Number(totalRow?.value ?? 0)
    }
  }

  async isConversationMember(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId)
        )
      )
      .limit(1)
    return Boolean(row)
  }

  async attachReadyFiles(data: AttachFilesData): Promise<number> {
    if (data.fileIds.length === 0) {
      return 0
    }
    const updated = await this.db
      .update(files)
      .set({
        messageId: data.messageId ?? null,
        postId: data.postId ?? null
      })
      .where(
        and(
          inArray(files.id, data.fileIds),
          eq(files.workspaceId, data.workspaceId),
          eq(files.uploadedBy, data.actorId),
          eq(files.status, 'ready'),
          isNull(files.messageId),
          isNull(files.postId),
          isNull(files.deletedAt)
        )
      )
      .returning({ id: files.id })
    return updated.length
  }

  private visibleToMember(workspaceId: string, actorId: string) {
    return and(
      eq(files.workspaceId, workspaceId),
      eq(files.status, 'ready'),
      isNull(files.deletedAt),
      or(
        sql`${files.postId} IS NOT NULL`,
        and(
          sql`${files.messageId} IS NOT NULL`,
          or(
            eq(conversations.type, 'channel'),
            sql`exists (select 1 from conversation_members cm where cm.conversation_id = ${conversations.id} and cm.user_id = ${actorId})`
          )
        )
      )
    )
  }

  private async groupByParent(
    ids: string[],
    kind: 'message' | 'post'
  ): Promise<Map<string, FileRecord[]>> {
    const grouped = new Map<string, FileRecord[]>()
    if (ids.length === 0) {
      return grouped
    }
    const rows = await this.baseQuery().where(
      and(
        kind === 'message'
          ? inArray(files.messageId, ids)
          : inArray(files.postId, ids),
        eq(files.status, 'ready'),
        isNull(files.deletedAt)
      )
    )
    for (const row of rows) {
      const record = this.toRecord(row)
      const parentId = kind === 'message' ? record.messageId : record.postId
      if (!parentId) {
        continue
      }
      const list = grouped.get(parentId) ?? []
      list.push(record)
      grouped.set(parentId, list)
    }
    return grouped
  }

  private baseQuery() {
    return this.db
      .select({
        id: files.id,
        workspaceId: files.workspaceId,
        uploadedBy: files.uploadedBy,
        originalName: files.originalName,
        contentType: files.contentType,
        byteSize: files.byteSize,
        objectKey: files.objectKey,
        status: files.status,
        messageId: files.messageId,
        postId: files.postId,
        createdAt: files.createdAt,
        uploadedAt: files.uploadedAt,
        deletedAt: files.deletedAt,
        conversationId: messages.conversationId,
        conversationType: conversations.type,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(files)
      .leftJoin(profiles, eq(profiles.userId, files.uploadedBy))
      .leftJoin(messages, eq(messages.id, files.messageId))
      .leftJoin(conversations, eq(conversations.id, messages.conversationId))
      .leftJoin(posts, eq(posts.id, files.postId))
  }

  private toRecord(row: {
    id: string
    workspaceId: string
    uploadedBy: string
    originalName: string
    contentType: string
    byteSize: number
    objectKey: string
    status: string
    messageId: string | null
    postId: string | null
    createdAt: Date
    uploadedAt: Date | null
    deletedAt: Date | null
    conversationId: string | null
    conversationType: string | null
    displayName: string | null
    jobTitle: string | null
    avatarUrl: string | null
  }): FileRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      uploadedBy: row.uploadedBy,
      originalName: row.originalName,
      contentType: row.contentType,
      byteSize: row.byteSize,
      objectKey: row.objectKey,
      status: row.status as FileStatus,
      messageId: row.messageId,
      postId: row.postId,
      conversationId: row.conversationId,
      conversationType: row.conversationType,
      createdAt: row.createdAt,
      uploadedAt: row.uploadedAt,
      deletedAt: row.deletedAt,
      uploader: {
        id: row.uploadedBy,
        displayName: row.displayName || emptyUploader.displayName,
        jobTitle: row.jobTitle ?? emptyUploader.jobTitle,
        avatarUrl: row.avatarUrl
      }
    }
  }
}
