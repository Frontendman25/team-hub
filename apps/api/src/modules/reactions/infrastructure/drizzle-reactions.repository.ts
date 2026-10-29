import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { reactions } from '../../../infrastructure/database/schema/reactions'
import type { ReactionsRepository } from '../domain/reactions.repository'

@Injectable()
export class DrizzleReactionsRepository implements ReactionsRepository {
  constructor(private readonly db: Database) {}

  async add(postId: string, userId: string, type: string): Promise<boolean> {
    const inserted = await this.db
      .insert(reactions)
      .values({ postId, userId, type })
      .onConflictDoNothing()
      .returning({ id: reactions.id })
    return inserted.length > 0
  }

  async remove(postId: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)))
      .returning({ id: reactions.id })
    return deleted.length > 0
  }
}
