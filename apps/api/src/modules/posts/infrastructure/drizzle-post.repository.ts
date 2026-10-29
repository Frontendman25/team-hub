import { Injectable } from '@nestjs/common'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { attachReadyFilesInTx } from '../../files/infrastructure/attach-ready-files'
import { comments } from '../../../infrastructure/database/schema/comments'
import { posts } from '../../../infrastructure/database/schema/posts'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { reactions } from '../../../infrastructure/database/schema/reactions'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import type {
  CreatePostData,
  ListPostsQuery,
  ListPostsResult,
  PostRecord,
  PostRepository,
  UpdatePostData
} from '../domain/post.repository'

type PostRow = {
  id: string
  workspaceId: string
  authorId: string
  content: string
  imageUrl: string | null
  imageAlt: string | null
  createdAt: Date
  updatedAt: Date
  displayName: string
  jobTitle: string
  avatarUrl: string | null
  commentsCount: number | string
  reactionsCount: number | string
  viewerHasReacted: boolean | number | string
}

@Injectable()
export class DrizzlePostRepository implements PostRepository {
  constructor(private readonly db: Database) {}

  async create(data: CreatePostData): Promise<PostRecord> {
    const created = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(posts)
        .values({
          workspaceId: data.workspaceId,
          authorId: data.authorId,
          content: data.content,
          imageUrl: data.imageUrl ?? null,
          imageAlt: data.imageAlt ?? null
        })
        .returning({ id: posts.id })
      if (!row) {
        throw new Error('Post insert did not return an id')
      }
      await attachReadyFilesInTx(tx as unknown as Database, {
        workspaceId: data.workspaceId,
        actorId: data.authorId,
        fileIds: data.attachmentIds ?? [],
        postId: row.id
      })
      return row
    })

    const record = await this.findById(created.id, data.authorId)

    if (!record) {
      throw new Error('Post was created but could not be loaded')
    }

    return record
  }

  async findById(id: string, viewerId?: string): Promise<PostRecord | null> {
    const [row] = await this.baseQuery(viewerId).where(eq(posts.id, id))
    return row ? this.toRecord(row) : null
  }

  async list(query: ListPostsQuery): Promise<ListPostsResult> {
    const filters = query.authorId
      ? and(
          eq(posts.workspaceId, query.workspaceId),
          eq(posts.authorId, query.authorId)
        )
      : eq(posts.workspaceId, query.workspaceId)

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(posts)
      .where(filters)

    const rows = await this.baseQuery(query.viewerId)
      .where(filters)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(query.limit)
      .offset(query.offset)

    return {
      items: rows.map((row) => this.toRecord(row)),
      total: Number(totalRow.value)
    }
  }

  async update(id: string, data: UpdatePostData): Promise<PostRecord | null> {
    const patch: Partial<typeof posts.$inferInsert> = {
      updatedAt: new Date()
    }

    if (data.content !== undefined) {
      patch.content = data.content
    }
    if (data.imageUrl !== undefined) {
      patch.imageUrl = data.imageUrl
    }
    if (data.imageAlt !== undefined) {
      patch.imageAlt = data.imageAlt
    }

    const [updated] = await this.db
      .update(posts)
      .set(patch)
      .where(eq(posts.id, id))
      .returning({ id: posts.id })

    if (!updated) {
      return null
    }

    return this.findById(updated.id)
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ id: posts.id })

    return deleted.length > 0
  }

  private baseQuery(viewerId?: string) {
    const viewerHasReacted = viewerId
      ? sql<boolean>`bool_or(${reactions.userId} = ${viewerId}::uuid)`
      : sql<boolean>`false`

    return this.db
      .select({
        id: posts.id,
        workspaceId: posts.workspaceId,
        authorId: posts.authorId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        imageAlt: posts.imageAlt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl,
        commentsCount: sql<number>`cast(count(distinct ${comments.id}) as int)`,
        reactionsCount: sql<number>`cast(count(distinct ${reactions.id}) as int)`,
        viewerHasReacted
      })
      .from(posts)
      .innerJoin(profiles, eq(profiles.userId, posts.authorId))
      .leftJoin(comments, eq(comments.postId, posts.id))
      .leftJoin(reactions, eq(reactions.postId, posts.id))
      .groupBy(
        posts.id,
        posts.workspaceId,
        posts.authorId,
        posts.content,
        posts.imageUrl,
        posts.imageAlt,
        posts.createdAt,
        posts.updatedAt,
        profiles.displayName,
        profiles.jobTitle,
        profiles.avatarUrl
      )
  }

  private toRecord(row: PostRow): PostRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      authorId: row.authorId,
      content: row.content,
      imageUrl: row.imageUrl,
      imageAlt: row.imageAlt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      commentsCount: Number(row.commentsCount),
      reactionsCount: Number(row.reactionsCount),
      viewerHasReacted: Boolean(row.viewerHasReacted),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        jobTitle: row.jobTitle,
        avatarUrl: row.avatarUrl
      }
    }
  }
}
