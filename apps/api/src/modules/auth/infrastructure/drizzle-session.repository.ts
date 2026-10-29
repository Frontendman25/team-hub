import { and, eq, gt, isNull, or, sql } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { sessions } from '../../../infrastructure/database/schema/sessions'
import { users } from '../../../infrastructure/database/schema/users'
import type {
  CreateSessionData,
  SessionRecord,
  SessionRepository
} from '../domain/session.repository'

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(data: CreateSessionData): Promise<SessionRecord> {
    const [row] = await this.db
      .insert(sessions)
      .values({
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt
      })
      .returning()

    if (!row) {
      throw new Error('Failed to create session')
    }

    return row
  }

  async findActiveByTokenHash(
    tokenHash: string
  ): Promise<SessionRecord | null> {
    const [row] = await this.db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        tokenHash: sessions.tokenHash,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          or(
            sql`${users.accountKind} <> 'guest'`,
            gt(users.guestExpiresAt, new Date())
          )
        )
      )
      .limit(1)

    return row ?? null
  }

  async revokeById(id: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, id))
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
  }
}
