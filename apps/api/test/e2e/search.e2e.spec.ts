import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import { DEMO_WORKSPACE_ID } from '../../src/infrastructure/database/demo-users'
import { createTestDb, seedTestUsers, type TestDb } from '../setup/db'
import { loginAs } from '../setup/http'

describe('Global search HTTP', () => {
  let app: INestApplication
  let testDb: TestDb
  let sarah: string[]
  let james: string[]
  let emily: string[]

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
    emily = await loginAs(app, 'emily.carter@teamhub.local')
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  it('finds people and channels for members and 403s outsiders', async () => {
    const people = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/search?q=Sarah`)
      .set('Cookie', sarah)
      .expect(200)
    expect(
      people.body.data.some(
        (hit: { kind: string; title: string }) =>
          hit.kind === 'person' && hit.title.includes('Sarah')
      )
    ).toBe(true)

    const channels = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/search?q=general`)
      .set('Cookie', sarah)
      .expect(200)
    expect(
      channels.body.data.some((hit: { kind: string }) => hit.kind === 'channel')
    ).toBe(true)

    const privateWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Search Lab' })
      .expect(201)

    await request(app.getHttpServer())
      .get(`/workspaces/${privateWs.body.id}/search?q=general`)
      .set('Cookie', james)
      .expect(403)
  })

  it('keeps DM messages private and skips soft-deleted rows', async () => {
    const dm = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/dms`)
      .set('Cookie', sarah)
      .send({ userId: '22222222-2222-4222-8222-222222222222' })
      .expect(201)

    const token = `zebraunique${Date.now()}`
    const created = await request(app.getHttpServer())
      .post(`/conversations/${dm.body.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: `secret ${token} payload`,
        clientId: crypto.randomUUID()
      })
      .expect(201)

    const jamesHits = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/search?q=${token}&kinds=message`)
      .set('Cookie', james)
      .expect(200)
    expect(jamesHits.body.data.length).toBeGreaterThan(0)

    const emilyHits = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/search?q=${token}&kinds=message`)
      .set('Cookie', emily)
      .expect(200)
    expect(emilyHits.body.data).toEqual([])

    await request(app.getHttpServer())
      .delete(`/messages/${created.body.id}`)
      .set('Cookie', sarah)
      .expect(200)

    const afterDelete = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/search?q=${token}&kinds=message`)
      .set('Cookie', james)
      .expect(200)
    expect(afterDelete.body.data).toEqual([])
  })

  it('ranks a unique post phrase', async () => {
    const phrase = `lumenforge${Date.now()}`
    await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', sarah)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: `Shipping the ${phrase} rollout this week`
      })
      .expect(201)

    const hits = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/search?q=${phrase}&kinds=post`)
      .set('Cookie', sarah)
      .expect(200)
    expect(hits.body.data[0]?.kind).toBe('post')
    expect(hits.body.data[0]?.href).toMatch(/^\/posts\//)
  })
})
