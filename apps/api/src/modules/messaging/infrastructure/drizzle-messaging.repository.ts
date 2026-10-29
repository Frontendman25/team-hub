import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { toPrefixTsQuery } from '../../../infrastructure/search/prefix-tsquery'
import {
  conversationMembers,
  conversations,
  messages
} from '../../../infrastructure/database/schema/messaging'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import {
  encodeMessageCursor,
  type MessageCursor
} from '../../../infrastructure/realtime/cursor'
import type {
  CreateChannelData,
  CreateDmData,
  InsertMessageData,
  MessagingRepository
} from '../domain/messaging.repository'
import { attachReadyFilesInTx } from '../../files/infrastructure/attach-ready-files'
import type {
  ConversationRecord,
  ConversationRow,
  LastMessagePreview,
  MessageAuthor,
  MessageRecord
} from '../domain/types'

const emptyAuthor: MessageAuthor = {
  id: '',
  displayName: 'Unknown',
  jobTitle: '',
  avatarUrl: null
}

export class DrizzleMessagingRepository implements MessagingRepository {
  constructor(private readonly db: Database) {}

  async createChannel(data: CreateChannelData): Promise<ConversationRecord> {
    const [created] = await this.db
      .insert(conversations)
      .values({
        workspaceId: data.workspaceId,
        type: 'channel',
        name: data.name,
        slug: data.slug,
        topic: data.topic,
        createdById: data.createdById
      })
      .returning()
    if (!created) {
      throw new Error('Channel insert did not return a row')
    }
    const summary = await this.summarize(created.id, data.createdById)
    if (!summary) {
      throw new Error('Failed to load created channel')
    }
    return summary
  }

  async updateChannel(
    id: string,
    data: { name?: string; topic?: string; slug?: string }
  ): Promise<ConversationRecord | null> {
    const [updated] = await this.db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning()
    if (!updated) {
      return null
    }
    return this.summarize(id, updated.createdById)
  }

  async channelSlugTaken(
    workspaceId: string,
    slug: string,
    exceptId?: string
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.slug, slug),
          eq(conversations.type, 'channel'),
          exceptId ? sql`${conversations.id} <> ${exceptId}` : sql`true`
        )
      )
      .limit(1)
    return Boolean(row)
  }

  async findConversation(id: string): Promise<ConversationRow | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)
    return row ?? null
  }

  async findDm(
    workspaceId: string,
    dmKey: string
  ): Promise<ConversationRow | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.type, 'dm'),
          eq(conversations.dmKey, dmKey)
        )
      )
      .limit(1)
    return row ?? null
  }

  async getOrCreateDm(data: CreateDmData): Promise<ConversationRow> {
    const existing = await this.findDm(data.workspaceId, data.dmKey)
    if (existing) {
      return existing
    }

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(conversations)
        .values({
          workspaceId: data.workspaceId,
          type: 'dm',
          dmKey: data.dmKey,
          createdById: data.createdById
        })
        .onConflictDoNothing()
        .returning()

      const row =
        created ??
        (
          await tx
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.workspaceId, data.workspaceId),
                eq(conversations.dmKey, data.dmKey)
              )
            )
            .limit(1)
        )[0]

      if (!row) {
        throw new Error('Failed to create direct message')
      }

      await tx
        .insert(conversationMembers)
        .values(
          data.memberIds.map((userId) => ({
            conversationId: row.id,
            userId
          }))
        )
        .onConflictDoNothing()

      return row
    })
  }

  async listForUser(
    workspaceId: string,
    userId: string
  ): Promise<ConversationRecord[]> {
    const channels = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.type, 'channel')
        )
      )

    const dms = await this.db
      .select({ conversation: conversations })
      .from(conversationMembers)
      .innerJoin(
        conversations,
        eq(conversations.id, conversationMembers.conversationId)
      )
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversations.workspaceId, workspaceId),
          eq(conversations.type, 'dm')
        )
      )

    const rows = [...channels, ...dms.map((row) => row.conversation)]
    return this.hydrate(rows, userId)
  }

  async summarize(
    id: string,
    userId: string
  ): Promise<ConversationRecord | null> {
    const row = await this.findConversation(id)
    if (!row) {
      return null
    }
    const [hydrated] = await this.hydrate([row], userId)
    return hydrated ?? null
  }

  async insertMessage(data: InsertMessageData): Promise<{
    message: MessageRecord
    duplicate: boolean
  }> {
    const inserted = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(messages)
        .values({
          conversationId: data.conversationId,
          authorId: data.authorId,
          content: data.content,
          clientId: data.clientId
        })
        .onConflictDoNothing({
          target: [
            messages.conversationId,
            messages.authorId,
            messages.clientId
          ]
        })
        .returning()

      if (created) {
        await tx
          .update(conversations)
          .set({
            lastMessageAt: created.createdAt,
            updatedAt: created.createdAt
          })
          .where(eq(conversations.id, data.conversationId))
        await attachReadyFilesInTx(tx as unknown as Database, {
          workspaceId: data.workspaceId,
          actorId: data.authorId,
          fileIds: data.attachmentIds ?? [],
          messageId: created.id
        })
      }

      return created
    })

    if (inserted) {
      const message = await this.findMessage(inserted.id)
      if (!message) {
        throw new Error('Failed to load inserted message')
      }
      return { message, duplicate: false }
    }

    const [existing] = await this.db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, data.conversationId),
          eq(messages.authorId, data.authorId),
          eq(messages.clientId, data.clientId)
        )
      )
      .limit(1)

    if (!existing) {
      throw new Error('Idempotent message lookup failed')
    }
    const message = await this.findMessage(existing.id)
    if (!message) {
      throw new Error('Failed to load duplicate message')
    }
    return { message, duplicate: true }
  }

  async listMessages(input: {
    conversationId: string
    cursor?: MessageCursor
    limit: number
  }): Promise<{ items: MessageRecord[]; nextCursor: string | null }> {
    const cursorFilter = input.cursor
      ? or(
          lt(messages.createdAt, input.cursor.createdAt),
          and(
            eq(messages.createdAt, input.cursor.createdAt),
            lt(messages.id, input.cursor.id)
          )
        )
      : undefined

    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        authorId: messages.authorId,
        content: messages.content,
        clientId: messages.clientId,
        editedAt: messages.editedAt,
        deletedAt: messages.deletedAt,
        createdAt: messages.createdAt,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(messages)
      .innerJoin(profiles, eq(profiles.userId, messages.authorId))
      .where(
        and(eq(messages.conversationId, input.conversationId), cursorFilter)
      )
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(input.limit + 1)

    const hasMore = rows.length > input.limit
    const page = hasMore ? rows.slice(0, input.limit) : rows
    const oldest = page[page.length - 1]
    const items = page.reverse().map((row) => this.toMessage(row))

    return {
      items,
      nextCursor:
        hasMore && oldest
          ? encodeMessageCursor(oldest.createdAt, oldest.id)
          : null
    }
  }

  async searchMessages(input: {
    workspaceId: string
    userId: string
    query: string
    limit: number
  }): Promise<MessageRecord[]> {
    const tsQuery = toPrefixTsQuery(input.query)
    if (!tsQuery) {
      return []
    }
    const rows = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        authorId: messages.authorId,
        content: messages.content,
        clientId: messages.clientId,
        editedAt: messages.editedAt,
        deletedAt: messages.deletedAt,
        createdAt: messages.createdAt,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .innerJoin(profiles, eq(profiles.userId, messages.authorId))
      .leftJoin(
        conversationMembers,
        and(
          eq(conversationMembers.conversationId, conversations.id),
          eq(conversationMembers.userId, input.userId)
        )
      )
      .where(
        and(
          eq(conversations.workspaceId, input.workspaceId),
          isNull(messages.deletedAt),
          sql`messages.search_vector @@ to_tsquery('simple', ${tsQuery})`,
          or(
            eq(conversations.type, 'channel'),
            eq(conversationMembers.userId, input.userId)
          )
        )
      )
      .orderBy(
        desc(
          sql`ts_rank_cd(messages.search_vector, to_tsquery('simple', ${tsQuery}))`
        ),
        desc(messages.createdAt)
      )
      .limit(input.limit)

    return rows.map((row) => this.toMessage(row))
  }

  async findMessage(id: string): Promise<MessageRecord | null> {
    const [row] = await this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        authorId: messages.authorId,
        content: messages.content,
        clientId: messages.clientId,
        editedAt: messages.editedAt,
        deletedAt: messages.deletedAt,
        createdAt: messages.createdAt,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(messages)
      .leftJoin(profiles, eq(profiles.userId, messages.authorId))
      .where(eq(messages.id, id))
      .limit(1)
    return row ? this.toMessage(row) : null
  }

  async updateMessageContent(
    id: string,
    content: string
  ): Promise<MessageRecord | null> {
    const [updated] = await this.db
      .update(messages)
      .set({ content, editedAt: new Date() })
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
      .returning({ id: messages.id })
    if (!updated) {
      return null
    }
    return this.findMessage(updated.id)
  }

  async softDeleteMessage(id: string): Promise<MessageRecord | null> {
    const [updated] = await this.db
      .update(messages)
      .set({ deletedAt: new Date(), content: '' })
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
      .returning({ id: messages.id })
    if (!updated) {
      return null
    }
    return this.findMessage(updated.id)
  }

  async markRead(
    conversationId: string,
    userId: string,
    at: Date
  ): Promise<void> {
    await this.db
      .insert(conversationMembers)
      .values({ conversationId, userId, lastReadAt: at })
      .onConflictDoUpdate({
        target: [
          conversationMembers.conversationId,
          conversationMembers.userId
        ],
        set: { lastReadAt: at }
      })
  }

  async listMemberIds(conversationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId))
    return rows.map((row) => row.userId)
  }

  async isDmMember(conversationId: string, userId: string): Promise<boolean> {
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

  private async hydrate(
    rows: ConversationRow[],
    userId: string
  ): Promise<ConversationRecord[]> {
    if (rows.length === 0) {
      return []
    }

    const ids = rows.map((row) => row.id)
    const lastByConversation = await this.loadLastMessages(ids)
    const unreadByConversation = await this.loadUnreadCounts(ids, userId)
    const peers = await this.loadPeers(
      rows.filter((row) => row.type === 'dm').map((row) => row.id),
      userId
    )

    return rows
      .map((row) => ({
        id: row.id,
        workspaceId: row.workspaceId,
        type: row.type === 'dm' ? ('dm' as const) : ('channel' as const),
        name: row.name,
        slug: row.slug,
        topic: row.topic,
        createdById: row.createdById,
        lastMessageAt: row.lastMessageAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        unreadCount: unreadByConversation.get(row.id) ?? 0,
        lastMessage: lastByConversation.get(row.id) ?? null,
        peer: peers.get(row.id) ?? null
      }))
      .sort((left, right) => {
        const leftTime =
          left.lastMessageAt?.getTime() ?? left.createdAt.getTime()
        const rightTime =
          right.lastMessageAt?.getTime() ?? right.createdAt.getTime()
        return rightTime - leftTime
      })
  }

  private async loadLastMessages(
    ids: string[]
  ): Promise<Map<string, LastMessagePreview>> {
    const result = await this.db.execute(sql`
      SELECT DISTINCT ON (m.conversation_id)
        m.id,
        m.conversation_id,
        m.content,
        m.created_at,
        m.author_id,
        m.deleted_at,
        p.display_name
      FROM messages m
      INNER JOIN profiles p ON p.user_id = m.author_id
      WHERE m.conversation_id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `
      )})
      ORDER BY m.conversation_id, m.created_at DESC, m.id DESC
    `)

    const map = new Map<string, LastMessagePreview>()
    for (const row of result) {
      const record = row as Record<string, unknown>
      const conversationId = String(record.conversation_id)
      const deleted = record.deleted_at != null
      map.set(conversationId, {
        id: String(record.id),
        content: deleted ? '' : String(record.content ?? ''),
        createdAt: new Date(String(record.created_at)),
        authorId: String(record.author_id),
        authorName: String(record.display_name),
        deleted
      })
    }
    return map
  }

  private async loadUnreadCounts(
    ids: string[],
    userId: string
  ): Promise<Map<string, number>> {
    const result = await this.db.execute(sql`
      SELECT m.conversation_id, count(*)::int AS unread
      FROM messages m
      LEFT JOIN conversation_members cm
        ON cm.conversation_id = m.conversation_id
        AND cm.user_id = ${userId}
      WHERE m.conversation_id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `
      )})
        AND m.deleted_at IS NULL
        AND m.author_id <> ${userId}
        AND m.created_at > COALESCE(cm.last_read_at, '-infinity'::timestamptz)
      GROUP BY m.conversation_id
    `)

    const map = new Map<string, number>()
    for (const row of result) {
      const record = row as Record<string, unknown>
      map.set(String(record.conversation_id), Number(record.unread))
    }
    return map
  }

  private async loadPeers(
    ids: string[],
    userId: string
  ): Promise<Map<string, MessageAuthor>> {
    if (ids.length === 0) {
      return new Map()
    }

    const rows = await this.db
      .select({
        conversationId: conversationMembers.conversationId,
        id: conversationMembers.userId,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(conversationMembers)
      .innerJoin(profiles, eq(profiles.userId, conversationMembers.userId))
      .where(
        and(
          sql`${conversationMembers.conversationId} IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `
          )})`,
          sql`${conversationMembers.userId} <> ${userId}`
        )
      )

    return new Map(
      rows.map((row) => [
        row.conversationId,
        {
          id: row.id,
          displayName: row.displayName,
          jobTitle: row.jobTitle,
          avatarUrl: row.avatarUrl
        }
      ])
    )
  }

  private toMessage(row: {
    id: string
    conversationId: string
    authorId: string
    content: string
    clientId: string
    editedAt: Date | null
    deletedAt: Date | null
    createdAt: Date
    displayName: string | null
    jobTitle: string | null
    avatarUrl: string | null
  }): MessageRecord {
    const deleted = row.deletedAt != null
    return {
      id: row.id,
      conversationId: row.conversationId,
      authorId: row.authorId,
      content: deleted ? '' : row.content,
      clientId: row.clientId,
      editedAt: row.editedAt,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      author: {
        id: row.authorId,
        displayName: row.displayName || emptyAuthor.displayName,
        jobTitle: row.jobTitle ?? '',
        avatarUrl: row.avatarUrl
      }
    }
  }
}
