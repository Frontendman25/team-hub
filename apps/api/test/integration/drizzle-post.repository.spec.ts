import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  DEMO_CURRENT_USER_ID,
  DEMO_WORKSPACE_ID
} from '../../src/infrastructure/database/demo-users'
import { DrizzlePostRepository } from '../../src/modules/posts/infrastructure/drizzle-post.repository'
import {
  clearPosts,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'

describe('DrizzlePostRepository', () => {
  let testDb: TestDb
  let repository: DrizzlePostRepository

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)
    repository = new DrizzlePostRepository(testDb.db)
  })

  beforeEach(async () => {
    await clearPosts(testDb.db)
  })

  afterAll(async () => {
    await testDb.client.end({ timeout: 5 })
  })

  it('inserts a post and loads it with author and zero counts', async () => {
    const created = await repository.create({
      workspaceId: DEMO_WORKSPACE_ID,
      authorId: DEMO_CURRENT_USER_ID,
      content: 'Repository integration post'
    })

    expect(created.content).toBe('Repository integration post')
    expect(created.author.displayName).toBe('Sarah Chen')
    expect(created.commentsCount).toBe(0)
    expect(created.reactionsCount).toBe(0)

    const found = await repository.findById(created.id)
    expect(found?.id).toBe(created.id)
  })

  it('lists posts newest first with total count', async () => {
    await repository.create({
      workspaceId: DEMO_WORKSPACE_ID,
      authorId: DEMO_CURRENT_USER_ID,
      content: 'Older'
    })
    await repository.create({
      workspaceId: DEMO_WORKSPACE_ID,
      authorId: DEMO_CURRENT_USER_ID,
      content: 'Newer'
    })

    const page = await repository.list({
      workspaceId: DEMO_WORKSPACE_ID,
      limit: 10,
      offset: 0
    })

    expect(page.total).toBe(2)
    expect(page.items[0]?.content).toBe('Newer')
    expect(page.items[1]?.content).toBe('Older')
  })
})
