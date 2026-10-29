import { Injectable } from '@nestjs/common'
import { eq, ne } from 'drizzle-orm'
import type { AccountKind } from '../../demo/demo.constants'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { users } from '../../../infrastructure/database/schema/users'
import type { PublicUser, UsersRepository } from '../domain/users.repository'

@Injectable()
export class DrizzleUsersRepository implements UsersRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<PublicUser | null> {
    const [row] = await this.baseQuery().where(eq(users.id, id))
    return row ? this.toPublic(row) : null
  }

  async list(limit: number): Promise<PublicUser[]> {
    const rows = await this.baseQuery()
      .where(ne(users.accountKind, 'guest'))
      .limit(limit)
    return rows.map((row) => this.toPublic(row))
  }

  private baseQuery() {
    return this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: profiles.displayName,
        jobTitle: profiles.jobTitle,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        createdAt: users.createdAt,
        accountKind: users.accountKind,
        guestExpiresAt: users.guestExpiresAt
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
  }

  private toPublic(row: {
    id: string
    email: string
    displayName: string
    jobTitle: string
    bio: string
    avatarUrl: string | null
    createdAt: Date
    accountKind: string
    guestExpiresAt: Date | null
  }): PublicUser {
    const accountKind = row.accountKind as AccountKind
    return {
      ...row,
      accountKind,
      email: accountKind === 'guest' ? '' : row.email
    }
  }
}
