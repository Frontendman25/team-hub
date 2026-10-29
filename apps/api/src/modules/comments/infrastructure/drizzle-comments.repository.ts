import { Injectable } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { comments } from '../../../infrastructure/database/schema/comments'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import type {
  CommentRecord,
  CommentsRepository
} from '../domain/comments.repository'

@Injectable()
export class DrizzleCommentsRepository implements CommentsRepository {
  constructor(private readonly db: Database) {}

  async listByPost(postId: string): Promise<CommentRecord[]> {
    const rows = await this.baseQuery()
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt))
    return rows.map((row) => this.toRecord(row))
  }

  async create(data: {
    postId: string
    authorId: string
    content: string
  }): Promise<CommentRecord> {
    const [created] = await this.db
      .insert(comments)
      .values(data)
      .returning({ id: comments.id })

    if (!created) {
      throw new Error('Comment insert did not return an id')
    }

    const record = await this.findById(created.id)
    if (!record) {
      throw new Error('Comment was created but could not be loaded')
    }
    return record
  }

  async findById(id: string): Promise<CommentRecord | null> {
    const [row] = await this.baseQuery().where(eq(comments.id, id))
    return row ? this.toRecord(row) : null
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning({ id: comments.id })
    return deleted.length > 0
  }

  private baseQuery() {
    return this.db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        avatarUrl: profiles.avatarUrl
      })
      .from(comments)
      .innerJoin(profiles, eq(profiles.userId, comments.authorId))
  }

  private toRecord(row: {
    id: string
    postId: string
    authorId: string
    content: string
    createdAt: Date
    updatedAt: Date
    displayName: string
    jobTitle: string
    avatarUrl: string | null
  }): CommentRecord {
    return {
      id: row.id,
      postId: row.postId,
      authorId: row.authorId,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.authorId,
        displayName: row.displayName,
        jobTitle: row.jobTitle,
        avatarUrl: row.avatarUrl
      }
    }
  }
}
