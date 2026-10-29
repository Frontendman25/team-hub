import { resolve } from 'node:path'
import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres, { type Sql } from 'postgres'
import * as schema from '../../src/infrastructure/database/schema'
import {
  DEMO_PASSWORD,
  DEMO_WORKSPACE_ID,
  demoUsers
} from '../../src/infrastructure/database/demo-users'
import { comments } from '../../src/infrastructure/database/schema/comments'
import { notifications } from '../../src/infrastructure/database/schema/notifications'
import { posts } from '../../src/infrastructure/database/schema/posts'
import { tasks } from '../../src/infrastructure/database/schema/tasks'
import { profiles } from '../../src/infrastructure/database/schema/profiles'
import { reactions } from '../../src/infrastructure/database/schema/reactions'
import { sessions } from '../../src/infrastructure/database/schema/sessions'
import { users } from '../../src/infrastructure/database/schema/users'
import { conversations } from '../../src/infrastructure/database/schema/messaging'
import {
  workspaceInvitations,
  workspaceMembers,
  workspaces
} from '../../src/infrastructure/database/schema/workspaces'
import type { Database } from '../../src/infrastructure/database/drizzle.service'

export type TestDb = {
  client: Sql
  db: Database
}

let demoPasswordHash: string | undefined

async function getDemoPasswordHash(): Promise<string> {
  demoPasswordHash ??= await hash(DEMO_PASSWORD)
  return demoPasswordHash
}

export async function createTestDb(): Promise<TestDb> {
  const url = process.env.POSTGRESQL_URL

  if (!url) {
    throw new Error('POSTGRESQL_URL is required for tests')
  }

  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })

  await migrate(db, {
    migrationsFolder: resolve(
      process.cwd(),
      'src/infrastructure/database/migrations'
    )
  })

  return { client, db }
}

export async function seedTestUsers(db: Database): Promise<void> {
  const passwordHash = await getDemoPasswordHash()

  await db
    .insert(users)
    .values(
      demoUsers.map(({ id, email }) => ({
        id,
        email,
        passwordHash,
        accountKind: 'demo_persona' as const
      }))
    )
    .onConflictDoUpdate({
      target: users.id,
      set: { passwordHash, accountKind: 'demo_persona' }
    })

  await db
    .insert(profiles)
    .values(
      demoUsers.map((user) => ({
        userId: user.id,
        displayName: user.displayName,
        jobTitle: user.jobTitle,
        bio: user.bio,
        avatarUrl: user.avatarUrl
      }))
    )
    .onConflictDoNothing()

  await db
    .insert(workspaces)
    .values({
      id: DEMO_WORKSPACE_ID,
      name: 'TeamHub',
      slug: 'teamhub',
      description: 'Company-wide workspace',
      createdById: demoUsers[0].id,
      kind: 'demo'
    })
    .onConflictDoNothing()

  await db
    .update(workspaces)
    .set({ kind: 'demo' })
    .where(eq(workspaces.id, DEMO_WORKSPACE_ID))

  await db
    .insert(workspaceMembers)
    .values(
      demoUsers.map((user, index) => ({
        workspaceId: DEMO_WORKSPACE_ID,
        userId: user.id,
        role: index === 0 ? 'owner' : 'member'
      }))
    )
    .onConflictDoNothing()

  await db
    .insert(conversations)
    .values({
      id: '99999999-9999-4999-8999-999999999991',
      workspaceId: DEMO_WORKSPACE_ID,
      type: 'channel',
      name: 'general',
      slug: 'general',
      topic: 'Company-wide conversation',
      createdById: demoUsers[0].id
    })
    .onConflictDoNothing()
}

export async function clearPosts(db: Database): Promise<void> {
  await db.delete(notifications)
  await db.delete(reactions)
  await db.delete(comments)
  await db.delete(posts)
  await db.delete(workspaceInvitations)
}

export async function clearSessions(db: Database): Promise<void> {
  await db.delete(sessions)
}

export async function clearTasks(db: Database): Promise<void> {
  await db.delete(tasks)
}
