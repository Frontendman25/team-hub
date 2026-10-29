import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import { DEMO_WORKSPACE_ID } from '../../src/infrastructure/database/demo-users'
import {
  clearPosts,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'
import { loginAs } from '../setup/http'

async function waitFor(predicate: () => Promise<boolean>, tries = 40) {
  for (let index = 0; index < tries; index += 1) {
    if (await predicate()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error('Timed out waiting for background job')
}

describe('Workspaces HTTP', () => {
  let app: INestApplication
  let testDb: TestDb
  let sarah: string[]
  let james: string[]

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()
    app = moduleRef.createNestApplication()
    configureHttp(app)
    await app.init()
    sarah = await loginAs(app, 'sarah.chen@teamhub.local')
    james = await loginAs(app, 'james.parker@teamhub.local')
  })

  beforeEach(async () => {
    await clearPosts(testDb.db)
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  it('creates a workspace and makes the actor the owner', async () => {
    const created = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Design Guild', description: 'Brand and product' })
      .expect(201)

    expect(created.body.slug).toContain('design-guild')
    const listed = await request(app.getHttpServer())
      .get('/workspaces')
      .set('Cookie', sarah)
      .expect(200)
    expect(
      listed.body.data.some((row: { id: string }) => row.id === created.body.id)
    ).toBe(true)
  })

  it('isolates posts across workspaces', async () => {
    const design = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Isolated Space' })
      .expect(201)

    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', sarah)
      .send({ workspaceId: design.body.id, content: 'Secret design note' })
      .expect(201)

    await request(app.getHttpServer())
      .get('/posts')
      .set('Cookie', james)
      .query({ workspaceId: design.body.id })
      .expect(403)

    const teamhub = await request(app.getHttpServer())
      .get('/posts')
      .set('Cookie', james)
      .query({ workspaceId: DEMO_WORKSPACE_ID })
      .expect(200)
    expect(
      teamhub.body.data.some(
        (post: { content: string }) => post.content === 'Secret design note'
      )
    ).toBe(false)
  })

  it('enforces invitation RBAC and delivers an in-app notification via BullMQ', async () => {
    const workspace = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Invite Lab' })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/workspaces/${workspace.body.id}/invitations`)
      .set('Cookie', james)
      .send({
        invites: [{ email: 'sarah.chen@teamhub.local', role: 'member' }]
      })
      .expect(403)

    const invited = await request(app.getHttpServer())
      .post(`/workspaces/${workspace.body.id}/invitations`)
      .set('Cookie', sarah)
      .send({
        invites: [{ email: 'james.parker@teamhub.local', role: 'member' }]
      })
      .expect(201)

    expect(invited.body.data).toHaveLength(1)

    await waitFor(async () => {
      const inbox = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', james)
      return inbox.body.data.some(
        (item: { type: string }) => item.type === 'invitation'
      )
    })

    const inbox = await request(app.getHttpServer())
      .get('/notifications')
      .set('Cookie', james)
      .expect(200)
    expect(inbox.body.data[0].type).toBe('invitation')

    await request(app.getHttpServer())
      .post(`/invitations/${invited.body.data[0].id}/accept`)
      .set('Cookie', james)
      .expect(201)

    await request(app.getHttpServer())
      .get('/posts')
      .set('Cookie', james)
      .query({ workspaceId: workspace.body.id })
      .expect(200)
  })

  it('returns 404 for a post outside the viewer workspace', async () => {
    const design = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Hidden Posts' })
      .expect(201)

    const created = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', sarah)
      .send({ workspaceId: design.body.id, content: 'Members only' })
      .expect(201)

    await request(app.getHttpServer())
      .get(`/posts/${created.body.id}`)
      .set('Cookie', james)
      .expect(404)
  })

  it('rejects a second pending invite to the same email', async () => {
    const workspace = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Dup Invite' })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/workspaces/${workspace.body.id}/invitations`)
      .set('Cookie', sarah)
      .send({
        invites: [{ email: 'james.parker@teamhub.local', role: 'member' }]
      })
      .expect(201)

    const again = await request(app.getHttpServer())
      .post(`/workspaces/${workspace.body.id}/invitations`)
      .set('Cookie', sarah)
      .send({
        invites: [{ email: 'james.parker@teamhub.local', role: 'member' }]
      })
      .expect(400)

    expect(again.body.details.errors[0].message).toMatch(/already pending/i)
  })

  it('transfers ownership and then lets the former owner leave', async () => {
    const workspace = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Handoff' })
      .expect(201)

    const invited = await request(app.getHttpServer())
      .post(`/workspaces/${workspace.body.id}/invitations`)
      .set('Cookie', sarah)
      .send({
        invites: [{ email: 'james.parker@teamhub.local', role: 'admin' }]
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/invitations/${invited.body.data[0].id}/accept`)
      .set('Cookie', james)
      .expect(201)

    await request(app.getHttpServer())
      .post(`/workspaces/${workspace.body.id}/transfer`)
      .set('Cookie', sarah)
      .send({ userId: '22222222-2222-4222-8222-222222222222' })
      .expect(204)

    await request(app.getHttpServer())
      .delete(
        `/workspaces/${workspace.body.id}/members/11111111-1111-4111-8111-111111111111`
      )
      .set('Cookie', sarah)
      .expect(204)

    await request(app.getHttpServer())
      .get(`/workspaces/${workspace.body.id}`)
      .set('Cookie', sarah)
      .expect(403)
  })

  it('protects the last owner from leaving', async () => {
    const workspace = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Owner Lock' })
      .expect(201)

    await request(app.getHttpServer())
      .delete(
        `/workspaces/${workspace.body.id}/members/11111111-1111-4111-8111-111111111111`
      )
      .set('Cookie', sarah)
      .expect(403)
  })

  it('caches unread count then invalidates after mark-all', async () => {
    const first = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', sarah)
      .expect(200)
    expect(['hit', 'miss']).toContain(first.headers['x-teamhub-cache'])

    const second = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', sarah)
      .expect(200)
    expect(second.headers['x-teamhub-cache']).toBe('hit')
    expect(second.body.count).toBe(first.body.count)

    await request(app.getHttpServer())
      .post('/notifications/read-all')
      .set('Cookie', sarah)
      .expect(204)

    const third = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Cookie', sarah)
      .expect(200)
    expect(third.headers['x-teamhub-cache']).toBe('miss')
    expect(third.body.count).toBe(0)
  })
})
