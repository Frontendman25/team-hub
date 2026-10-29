import { eq } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import { profiles } from '../../../infrastructure/database/schema/profiles'
import { users } from '../../../infrastructure/database/schema/users'
import { ConflictError } from '../../../shared/domain/errors'
import type { AccountKind } from '../../demo/demo.constants'
import type {
  AuthUserRepository,
  LoginUser,
  PublicAuthUser,
  RegisterUserData
} from '../domain/auth-user.repository'

const publicUserColumns = {
  id: users.id,
  email: users.email,
  passwordHash: users.passwordHash,
  displayName: profiles.displayName,
  jobTitle: profiles.jobTitle,
  bio: profiles.bio,
  avatarUrl: profiles.avatarUrl,
  createdAt: users.createdAt,
  accountKind: users.accountKind,
  guestExpiresAt: users.guestExpiresAt
} as const

function toPublic(row: {
  id: string
  email: string
  displayName: string
  jobTitle: string
  bio: string
  avatarUrl: string | null
  createdAt: Date
  accountKind: string
  guestExpiresAt: Date | null
}): PublicAuthUser {
  const accountKind = row.accountKind as AccountKind
  return {
    id: row.id,
    email: accountKind === 'guest' ? '' : row.email,
    displayName: row.displayName,
    jobTitle: row.jobTitle,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    accountKind,
    guestExpiresAt: row.guestExpiresAt
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  if ('code' in error && (error as { code: unknown }).code === '23505') {
    return true
  }

  if ('cause' in error) {
    return isUniqueViolation((error as { cause: unknown }).cause)
  }

  return false
}

export class DrizzleAuthUserRepository implements AuthUserRepository {
  constructor(private readonly db: Database) {}

  async findLoginByEmail(email: string): Promise<LoginUser | null> {
    const [row] = await this.db
      .select(publicUserColumns)
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.email, email))
      .limit(1)

    return row
      ? { ...toPublic(row), email: row.email, passwordHash: row.passwordHash }
      : null
  }

  async findById(id: string): Promise<PublicAuthUser | null> {
    const [row] = await this.db
      .select(publicUserColumns)
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, id))
      .limit(1)

    return row ? toPublic(row) : null
  }

  async create(data: RegisterUserData): Promise<PublicAuthUser> {
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email: data.email,
            passwordHash: data.passwordHash,
            accountKind: data.accountKind ?? 'registered',
            guestExpiresAt: data.guestExpiresAt ?? null
          })
          .returning({ id: users.id })

        if (!user) {
          throw new Error('Failed to create user')
        }

        await tx.insert(profiles).values({
          userId: user.id,
          displayName: data.displayName,
          jobTitle: data.jobTitle,
          bio: data.bio
        })

        const [created] = await tx
          .select(publicUserColumns)
          .from(users)
          .innerJoin(profiles, eq(profiles.userId, users.id))
          .where(eq(users.id, user.id))

        if (!created) {
          throw new Error('Failed to load created user')
        }

        return toPublic(created)
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Email is already registered')
      }
      throw error
    }
  }

  async extendGuestExpiry(userId: string, guestExpiresAt: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ guestExpiresAt })
      .where(eq(users.id, userId))
  }
}
