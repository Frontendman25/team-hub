import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import {
  DEMO_WORKSPACE_ID,
  demoUsers
} from '../../src/infrastructure/database/demo-users'
import { users } from '../../src/infrastructure/database/schema/users'
import { CleanupDemoGuestsUseCase } from '../../src/modules/demo/application/cleanup-demo-guests.use-case'
import {
  clearPosts,
  clearSessions,
  clearTasks,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'
import { loginAs } from '../setup/http'

describe('Public demo', () => {
  let app: INestApplication
  let testDb: TestDb

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleRef.createNestApplication()
    configureHttp(app)
    await app.init()
  })

  beforeEach(async () => {
    await clearSessions(testDb.db)
    await clearPosts(testDb.db)
    await clearTasks(testDb.db)
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  async function startGuest() {
    const response = await request(app.getHttpServer())
      .post('/auth/demo')
      .expect(200)
    const setCookie = response.headers['set-cookie']
    const cookies = (
      Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    ).map((value) => value.split(';')[0] ?? value)
    return {
      body: response.body as { id: string; accountKind: string },
      cookies
    }
  }

  it('issues a unique guest session in the demo workspace', async () => {
    const first = await startGuest()
    expect(first.body.accountKind).toBe('guest')
    expect(first.body.email).toBe('')

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', first.cookies)
      .expect(200)
    expect(me.body.accountKind).toBe('guest')

    const workspaces = await request(app.getHttpServer())
      .get('/workspaces')
      .set('Cookie', first.cookies)
      .expect(200)
    expect(workspaces.body.data).toHaveLength(1)
    expect(workspaces.body.data[0].id).toBe(DEMO_WORKSPACE_ID)
    expect(workspaces.body.data[0].kind).toBe('demo')

    const second = await startGuest()
    expect(second.body.id).not.toBe(first.body.id)

    const directory = await request(app.getHttpServer())
      .get('/users')
      .expect(200)
    expect(
      (directory.body as { email: string }[]).every((row) => row.email === '')
    ).toBe(true)

    const members = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/members`)
      .set('Cookie', first.cookies)
      .expect(200)
    expect(
      (members.body.data as { email: string }[]).every(
        (row) => row.email === ''
      )
    ).toBe(true)
  })

  it('extends guest_expires_at when Try Demo is used again', async () => {
    const guest = await startGuest()
    await testDb.db
      .update(users)
      .set({ guestExpiresAt: new Date(Date.now() + 60_000) })
      .where(eq(users.id, guest.body.id))

    const refreshed = await request(app.getHttpServer())
      .post('/auth/demo')
      .set('Cookie', guest.cookies)
      .expect(200)
    expect(refreshed.body.id).toBe(guest.body.id)

    const row = await testDb.db
      .select({ guestExpiresAt: users.guestExpiresAt })
      .from(users)
      .where(eq(users.id, guest.body.id))
    const remaining = row[0]?.guestExpiresAt
      ? row[0].guestExpiresAt.getTime() - Date.now()
      : 0
    expect(remaining).toBeGreaterThan(60 * 60 * 1000)
  })

  it('lets a guest create a post and forbids mutating seeded author content', async () => {
    const sarah = await loginAs(app)
    const seeded = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', sarah)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'Canonical demo update from Sarah'
      })
      .expect(201)

    const guest = await startGuest()
    const created = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', guest.cookies)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'Hello from a visitor'
      })
      .expect(201)
    expect(created.body.authorId).toBe(guest.body.id)

    await request(app.getHttpServer())
      .patch(`/posts/${seeded.body.id}`)
      .set('Cookie', guest.cookies)
      .send({ content: 'hacked' })
      .expect(403)

    await request(app.getHttpServer())
      .delete(`/posts/${seeded.body.id}`)
      .set('Cookie', guest.cookies)
      .expect(403)

    await request(app.getHttpServer())
      .patch(`/posts/${created.body.id}`)
      .set('Cookie', guest.cookies)
      .send({ content: 'Edited by the visitor' })
      .expect(200)
  })

  it("blocks guest workspace admin, DMs, and moving other people's tasks", async () => {
    const sarah = await loginAs(app)
    const task = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', sarah)
      .send({ title: 'Protected board card' })
      .expect(201)

    const guest = await startGuest()
    await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', guest.cookies)
      .send({ name: 'Should fail' })
      .expect(403)

    await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/dms`)
      .set('Cookie', guest.cookies)
      .send({ userId: demoUsers[1].id })
      .expect(403)

    await request(app.getHttpServer())
      .post(`/tasks/${task.body.id}/move`)
      .set('Cookie', guest.cookies)
      .send({ status: 'done', position: 0, version: task.body.version })
      .expect(403)
  })

  it('keeps a registered private workspace isolated from guests', async () => {
    const email = `owner.${Date.now()}@example.com`
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Password12',
        displayName: 'Private Owner'
      })
      .expect(201)
    const ownerCookie = (
      Array.isArray(registered.headers['set-cookie'])
        ? registered.headers['set-cookie']
        : [registered.headers['set-cookie']]
    ).map((value: string) => value.split(';')[0])

    const privateWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', ownerCookie)
      .send({ name: 'Northwind Private' })
      .expect(201)

    const guest = await startGuest()
    await request(app.getHttpServer())
      .get(`/workspaces/${privateWs.body.slug}`)
      .set('Cookie', guest.cookies)
      .expect(403)

    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', guest.cookies)
      .send({
        workspaceId: privateWs.body.id,
        content: 'should not land'
      })
      .expect(403)
  })

  it('purges expired guest rows and their content', async () => {
    const guest = await startGuest()
    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', guest.cookies)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'Temporary visitor post'
      })
      .expect(201)

    await testDb.db
      .update(users)
      .set({ guestExpiresAt: new Date(Date.now() - 60_000) })
      .where(eq(users.id, guest.body.id))

    const cleanup = app.get(CleanupDemoGuestsUseCase)
    const result = await cleanup.execute()
    expect(result.removed).toBeGreaterThanOrEqual(1)

    const remaining = await testDb.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, guest.body.id))
    expect(remaining).toHaveLength(0)

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', guest.cookies)
      .expect(401)
  })
})
