import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import {
  DEMO_CURRENT_USER_ID,
  DEMO_WORKSPACE_ID
} from '../../src/infrastructure/database/demo-users'
import {
  clearPosts,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'
import { loginAs } from '../setup/http'

describe('Posts HTTP', () => {
  let app: INestApplication
  let testDb: TestDb
  let cookie: string[]

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleRef.createNestApplication()
    configureHttp(app)
    await app.init()
    cookie = await loginAs(app)
  })

  beforeEach(async () => {
    await clearPosts(testDb.db)
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  it('POST /posts requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .send({ workspaceId: DEMO_WORKSPACE_ID, content: 'Unauthenticated post' })
      .expect(401)
  })

  it('POST /posts creates a post for the session user', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', cookie)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'API created this post'
      })
      .expect(201)

    expect(response.body.content).toBe('API created this post')
    expect(response.body.authorId).toBe(DEMO_CURRENT_USER_ID)
    expect(response.body.author.displayName).toBe('Sarah Chen')
  })

  it('GET /posts requires membership in the requested workspace', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', cookie)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'First visible post'
      })
      .expect(201)

    await request(app.getHttpServer())
      .get('/posts')
      .query({ limit: 20, offset: 0, workspaceId: DEMO_WORKSPACE_ID })
      .expect(401)

    const response = await request(app.getHttpServer())
      .get('/posts')
      .set('Cookie', cookie)
      .query({ limit: 20, offset: 0, workspaceId: DEMO_WORKSPACE_ID })
      .expect(200)

    expect(response.body.pagination.total).toBe(1)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].content).toBe('First visible post')
  })

  it('POST /posts rejects empty content', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', cookie)
      .send({ workspaceId: DEMO_WORKSPACE_ID, content: '   ' })
      .expect(400)
  })

  it('rejects cookie mutations from a foreign Origin', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', cookie)
      .set('Origin', 'http://evil.example')
      .send({ workspaceId: DEMO_WORKSPACE_ID, content: 'Cross site post' })
      .expect(403)
  })

  it('allows cookie mutations from the frontend Origin', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:3000')
      .send({ workspaceId: DEMO_WORKSPACE_ID, content: 'Same origin post' })
      .expect(201)
  })

  it('forbids editing another user post', async () => {
    const created = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', cookie)
      .send({ workspaceId: DEMO_WORKSPACE_ID, content: 'Sarah wrote this' })
      .expect(201)

    const james = await loginAs(app, 'james.parker@teamhub.local')
    await request(app.getHttpServer())
      .patch(`/posts/${created.body.id}`)
      .set('Cookie', james)
      .send({ content: 'James hijack' })
      .expect(403)
  })
})
