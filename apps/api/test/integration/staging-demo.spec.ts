import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  DEMO_PASSWORD,
  DEMO_WORKSPACE_ID
} from '../../src/infrastructure/database/demo-users'
import { ensureStagingDemo } from '../../src/infrastructure/database/staging-demo'
import { users } from '../../src/infrastructure/database/schema/users'
import { workspaces } from '../../src/infrastructure/database/schema/workspaces'
import { posts } from '../../src/infrastructure/database/schema/posts'
import { createTestDb, type TestDb } from '../setup/db'

describe('ensureStagingDemo', () => {
  let testDb: TestDb

  beforeAll(async () => {
    testDb = await createTestDb()
  })

  afterAll(async () => {
    await testDb.client.end({ timeout: 5 })
  })

  it('creates the demo workspace once and does not store the persona password', async () => {
    const first = await ensureStagingDemo(testDb.db)
    expect(first.workspaceId).toBe(DEMO_WORKSPACE_ID)

    const [workspace] = await testDb.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, DEMO_WORKSPACE_ID))
    expect(workspace?.kind).toBe('demo')

    const [owner] = await testDb.db
      .select()
      .from(users)
      .where(eq(users.email, 'demo.catalog@demo.invalid'))
    expect(owner?.accountKind).toBe('registered')
    expect(owner?.passwordHash.includes(DEMO_PASSWORD)).toBe(false)

    await testDb.db.insert(posts).values({
      workspaceId: DEMO_WORKSPACE_ID,
      authorId: owner!.id,
      content: 'Visitor post that must survive a second init'
    })

    const second = await ensureStagingDemo(testDb.db)
    expect(second.createdOwner).toBe(false)

    const catalogPosts = await testDb.db
      .select()
      .from(posts)
      .where(eq(posts.workspaceId, DEMO_WORKSPACE_ID))
    expect(
      catalogPosts.some((row) => row.content.includes('Visitor post'))
    ).toBe(true)
    expect(
      catalogPosts.filter((row) =>
        row.content.includes('Welcome to the TeamHub public demo')
      )
    ).toHaveLength(1)
  })
})
