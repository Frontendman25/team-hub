import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import {
  clearPosts,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'
import { DEMO_WORKSPACE_ID } from '../../src/infrastructure/database/demo-users'
import { loginAs } from '../setup/http'

const SARAH = 'sarah.chen@teamhub.local'
const DANIEL = 'daniel.kim@teamhub.local'

describe('Notifications HTTP', () => {
  let app: INestApplication
  let testDb: TestDb
  let sarah: string[]
  let daniel: string[]

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleRef.createNestApplication()
    configureHttp(app)
    await app.init()
    sarah = await loginAs(app, SARAH)
    daniel = await loginAs(app, DANIEL)
  })

  beforeEach(async () => {
    await clearPosts(testDb.db)
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  async function danielPost(): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', daniel)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'Daniel shipped the API layer'
      })
      .expect(201)
    return created.body.id as string
  }

  it('requires authentication to list notifications', async () => {
    await request(app.getHttpServer()).get('/notifications').expect(401)
    await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(401)
  })

  it('creates a comment notification for the post author, not the commenter', async () => {
    const postId = await danielPost()

    await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Cookie', sarah)
      .send({ content: 'Looks solid' })
      .expect(201)

    const forDaniel = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', daniel)
      .expect(200)

    expect(forDaniel.body.data).toHaveLength(1)
    expect(forDaniel.body.data[0].type).toBe('comment')
    expect(forDaniel.body.data[0].postId).toBe(postId)
    expect(forDaniel.body.data[0].actor.displayName).toBe('Sarah Chen')
    expect(forDaniel.body.data[0].readAt).toBeNull()

    const unread = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', daniel)
      .expect(200)
    expect(unread.body.count).toBe(1)

    const forSarah = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', sarah)
      .expect(200)
    expect(forSarah.body.data).toHaveLength(0)
  })

  it('does not notify a user who comments on their own post', async () => {
    const postId = await danielPost()

    await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Cookie', daniel)
      .send({ content: 'Adding context' })
      .expect(201)

    const inbox = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', daniel)
      .expect(200)
    expect(inbox.body.data).toHaveLength(0)
  })

  it('does not let Sarah read or mark Daniel notifications', async () => {
    const postId = await danielPost()
    await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Cookie', sarah)
      .send({ content: 'Private to Daniel' })
      .expect(201)

    const danielList = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', daniel)
      .expect(200)
    const notificationId = danielList.body.data[0].id as string

    const sarahList = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', sarah)
      .expect(200)
    expect(sarahList.body.data).toHaveLength(0)

    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Cookie', sarah)
      .expect(404)

    const stillUnread = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', daniel)
      .expect(200)
    expect(stillUnread.body.count).toBe(1)
  })

  it('deduplicates reaction notifications from the same actor on the same post', async () => {
    const postId = await danielPost()

    await request(app.getHttpServer())
      .post(`/posts/${postId}/reactions`)
      .set('Cookie', sarah)
      .expect(200)
    await request(app.getHttpServer())
      .post(`/posts/${postId}/reactions`)
      .set('Cookie', sarah)
      .expect(200)

    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', daniel)
      .expect(200)

    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].type).toBe('reaction')
  })

  it('marks one notification and all remaining as read', async () => {
    const postId = await danielPost()
    await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Cookie', sarah)
      .send({ content: 'First' })
      .expect(201)
    await request(app.getHttpServer())
      .post(`/posts/${postId}/reactions`)
      .set('Cookie', sarah)
      .expect(200)

    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', daniel)
      .expect(200)
    expect(list.body.data).toHaveLength(2)

    await request(app.getHttpServer())
      .patch(`/notifications/${list.body.data[0].id}/read`)
      .set('Cookie', daniel)
      .expect(204)

    const afterOne = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', daniel)
      .expect(200)
    expect(afterOne.body.count).toBe(1)

    await request(app.getHttpServer())
      .post('/notifications/read-all')
      .set('Cookie', daniel)
      .expect(204)

    const afterAll = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', daniel)
      .expect(200)
    expect(afterAll.body.count).toBe(0)
  })

  it('keeps the notification after the post is deleted and marks it as missing', async () => {
    const postId = await danielPost()
    await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Cookie', sarah)
      .send({ content: 'Before delete' })
      .expect(201)

    await request(app.getHttpServer())
      .delete(`/posts/${postId}`)
      .set('Cookie', daniel)
      .expect(204)

    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', daniel)
      .expect(200)

    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].postId).toBeNull()
    expect(list.body.data[0].postDeleted).toBe(true)
  })
})
