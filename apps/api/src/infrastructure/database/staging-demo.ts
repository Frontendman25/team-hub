import { randomBytes } from 'node:crypto'
import { hash } from '@node-rs/argon2'
import { and, eq } from 'drizzle-orm'
import { DEMO_WORKSPACE_ID, DEMO_WORKSPACE_SLUG } from './demo-users'
import { posts } from './schema/posts'
import { profiles } from './schema/profiles'
import { tasks } from './schema/tasks'
import { users } from './schema/users'
import {
  conversationMembers,
  conversations,
  messages
} from './schema/messaging'
import { workspaceMembers, workspaces } from './schema/workspaces'
import type { Database } from './drizzle.service'

/** Catalog owner — not a persona login. Password is random and never printed. */
export const STAGING_DEMO_OWNER_ID = '88888888-8888-4888-8888-888888888880'
export const STAGING_DEMO_OWNER_EMAIL = 'demo.catalog@demo.invalid'

const CHANNEL_GENERAL_ID = '99999999-9999-4999-8999-999999999991'
const CHANNEL_PRODUCT_ID = '99999999-9999-4999-8999-999999999994'
const POST_WELCOME_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const POST_BOARD_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const TASK_TODO_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const TASK_DOING_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const MESSAGE_HELLO_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'

/**
 * Idempotent public-demo catalog for staging. Does not enable persona
 * passwords and does not overwrite existing posts, tasks, or messages.
 */
export async function ensureStagingDemo(db: Database): Promise<{
  workspaceId: string
  createdOwner: boolean
}> {
  const existingOwner = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, STAGING_DEMO_OWNER_ID))
    .then((rows) => rows[0])

  if (!existingOwner) {
    const passwordHash = await hash(randomBytes(32).toString('hex'))
    await db.insert(users).values({
      id: STAGING_DEMO_OWNER_ID,
      email: STAGING_DEMO_OWNER_EMAIL,
      passwordHash,
      accountKind: 'registered'
    })
  }

  await db
    .insert(profiles)
    .values({
      userId: STAGING_DEMO_OWNER_ID,
      displayName: 'Demo catalog',
      jobTitle: 'TeamHub',
      bio: 'Fictional catalog owner for the public demo. Not a sign-in account.'
    })
    .onConflictDoNothing()

  const existingWorkspace = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, DEMO_WORKSPACE_ID))
    .then((rows) => rows[0])

  if (!existingWorkspace) {
    const slugTaken = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, DEMO_WORKSPACE_SLUG))
      .then((rows) => rows[0])
    if (slugTaken) {
      throw new Error(
        `Cannot create demo workspace: slug "${DEMO_WORKSPACE_SLUG}" is already used`
      )
    }
    await db.insert(workspaces).values({
      id: DEMO_WORKSPACE_ID,
      name: 'TeamHub Demo',
      slug: DEMO_WORKSPACE_SLUG,
      description: 'Public product demo. Fictional sample content only.',
      createdById: STAGING_DEMO_OWNER_ID,
      kind: 'demo'
    })
  } else {
    await db
      .update(workspaces)
      .set({ kind: 'demo' })
      .where(eq(workspaces.id, DEMO_WORKSPACE_ID))
  }

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId: DEMO_WORKSPACE_ID,
      userId: STAGING_DEMO_OWNER_ID,
      role: 'owner'
    })
    .onConflictDoNothing()

  const existingChannels = await db
    .select({ slug: conversations.slug, id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, DEMO_WORKSPACE_ID),
        eq(conversations.type, 'channel')
      )
    )
  const channelBySlug = new Map(
    existingChannels.map((row) => [row.slug, row.id])
  )
  const catalogChannels = [
    {
      id: CHANNEL_GENERAL_ID,
      slug: 'general',
      name: 'general',
      topic: 'Company-wide conversation'
    },
    {
      id: CHANNEL_PRODUCT_ID,
      slug: 'product',
      name: 'product',
      topic: 'Roadmap and launch notes'
    }
  ] as const
  for (const channel of catalogChannels) {
    if (channelBySlug.has(channel.slug)) {
      continue
    }
    await db.insert(conversations).values({
      id: channel.id,
      workspaceId: DEMO_WORKSPACE_ID,
      type: 'channel',
      name: channel.name,
      slug: channel.slug,
      topic: channel.topic,
      createdById: STAGING_DEMO_OWNER_ID
    })
  }

  const generalId = channelBySlug.get('general') ?? CHANNEL_GENERAL_ID
  const productId = channelBySlug.get('product') ?? CHANNEL_PRODUCT_ID

  await db
    .insert(conversationMembers)
    .values([
      {
        conversationId: generalId,
        userId: STAGING_DEMO_OWNER_ID
      },
      {
        conversationId: productId,
        userId: STAGING_DEMO_OWNER_ID
      }
    ])
    .onConflictDoNothing()

  await db
    .insert(posts)
    .values([
      {
        id: POST_WELCOME_ID,
        workspaceId: DEMO_WORKSPACE_ID,
        authorId: STAGING_DEMO_OWNER_ID,
        content:
          'Welcome to the TeamHub public demo. This workspace is shared and fictional.'
      },
      {
        id: POST_BOARD_ID,
        workspaceId: DEMO_WORKSPACE_ID,
        authorId: STAGING_DEMO_OWNER_ID,
        content:
          'Try the board, chat, and files. Guest posts disappear after a few hours.'
      }
    ])
    .onConflictDoNothing()

  const existingBoard = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      position: tasks.position
    })
    .from(tasks)
    .where(eq(tasks.workspaceId, DEMO_WORKSPACE_ID))
  const existingTaskIds = new Set(existingBoard.map((row) => row.id))
  const nextPosition = (status: string) =>
    Math.max(
      -1,
      ...existingBoard
        .filter((row) => row.status === status)
        .map((row) => row.position)
    ) + 1
  const catalogTasks = [
    {
      id: TASK_TODO_ID,
      title: 'Explore the public demo',
      description: 'Open Messages, the board, and Files.',
      status: 'todo',
      priority: 'medium',
      position: nextPosition('todo')
    },
    {
      id: TASK_DOING_ID,
      title: 'Move a card across columns',
      description: 'Drag or use the keyboard on the board.',
      status: 'in_progress',
      priority: 'low',
      position: nextPosition('in_progress')
    }
  ] as const
  const tasksToInsert = catalogTasks.filter(
    (task) => !existingTaskIds.has(task.id)
  )
  if (tasksToInsert.length > 0) {
    await db.insert(tasks).values(
      tasksToInsert.map((task) => ({
        ...task,
        workspaceId: DEMO_WORKSPACE_ID,
        createdBy: STAGING_DEMO_OWNER_ID
      }))
    )
  }

  await db
    .insert(messages)
    .values({
      id: MESSAGE_HELLO_ID,
      conversationId: generalId,
      authorId: STAGING_DEMO_OWNER_ID,
      content: 'Say hello in #general — this is sample catalog copy.',
      clientId: 'staging-demo-catalog-hello'
    })
    .onConflictDoNothing()

  return {
    workspaceId: DEMO_WORKSPACE_ID,
    createdOwner: !existingOwner
  }
}
