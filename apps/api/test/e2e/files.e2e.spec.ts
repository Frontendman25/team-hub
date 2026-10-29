import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import { DEMO_WORKSPACE_ID } from '../../src/infrastructure/database/demo-users'
import { files } from '../../src/infrastructure/database/schema/files'
import { createTestDb, seedTestUsers, type TestDb } from '../setup/db'
import { loginAs } from '../setup/http'

async function uploadReady(
  app: INestApplication,
  cookie: string[],
  workspaceId: string,
  name = 'photo.jpg',
  contentType = 'image/jpeg',
  byteSize = 12
) {
  const initiated = await request(app.getHttpServer())
    .post(`/workspaces/${workspaceId}/files`)
    .set('Cookie', cookie)
    .send({
      originalName: name,
      contentType,
      byteSize
    })
    .expect(201)
  const completed = await request(app.getHttpServer())
    .post(`/files/${initiated.body.file.id}/complete`)
    .set('Cookie', cookie)
    .expect(200)
  return completed.body as { id: string; objectKey?: string; status: string }
}

describe('Files HTTP', () => {
  let app: INestApplication
  let testDb: TestDb
  let sarah: string[]
  let james: string[]
  let emily: string[]

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)
    await testDb.db.delete(files)
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

  it('rejects disallowed types and never echoes object keys', async () => {
    const svg = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/files`)
      .set('Cookie', sarah)
      .send({
        originalName: 'xss.svg',
        contentType: 'image/svg+xml',
        byteSize: 40
      })
      .expect(400)
    expect(svg.body.code).toBe('VALIDATION')

    const file = await uploadReady(app, sarah, DEMO_WORKSPACE_ID)
    expect(file.objectKey).toBeUndefined()
    expect(file.status).toBe('ready')
  })

  it('attaches to a channel message and isolates other workspaces', async () => {
    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/conversations`)
      .set('Cookie', sarah)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    ) as { id: string }

    const file = await uploadReady(app, sarah, DEMO_WORKSPACE_ID, 'team.jpg')
    const sent = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: 'See attached',
        clientId: crypto.randomUUID(),
        attachmentIds: [file.id]
      })
      .expect(201)
    expect(sent.body.attachments).toHaveLength(1)
    expect(sent.body.attachments[0].id).toBe(file.id)

    const duplicate = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: 'See attached',
        clientId: sent.body.clientId,
        attachmentIds: [file.id]
      })
      .expect(201)
    expect(duplicate.body.id).toBe(sent.body.id)

    const full = await request(app.getHttpServer())
      .get(`/files/${file.id}/content`)
      .set('Cookie', sarah)
      .expect(200)
    expect(full.headers['accept-ranges']).toBe('bytes')

    const partial = await request(app.getHttpServer())
      .get(`/files/${file.id}/content`)
      .set('Cookie', sarah)
      .set('Range', 'bytes=0-4')
      .expect(206)
    expect(partial.headers['content-range']).toBe('bytes 0-4/12')
    expect(partial.headers['content-length']).toBe('5')

    await request(app.getHttpServer())
      .get(`/files/${file.id}/content`)
      .set('Cookie', sarah)
      .set('Range', 'bytes=99-120')
      .expect(416)

    const privateWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Files Lab' })
      .expect(201)

    await request(app.getHttpServer())
      .get(`/workspaces/${privateWs.body.id}/files`)
      .set('Cookie', james)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/files/${file.id}/content`)
      .set('Cookie', james)
      .expect(200)
  })

  it('keeps DM attachments private and forbids guessing ids', async () => {
    const dm = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/dms`)
      .set('Cookie', sarah)
      .send({ userId: '22222222-2222-4222-8222-222222222222' })
      .expect(201)

    const file = await uploadReady(app, sarah, DEMO_WORKSPACE_ID, 'secret.jpg')
    await request(app.getHttpServer())
      .post(`/conversations/${dm.body.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: '',
        clientId: crypto.randomUUID(),
        attachmentIds: [file.id]
      })
      .expect(201)

    await request(app.getHttpServer())
      .get(`/files/${file.id}/content`)
      .set('Cookie', emily)
      .expect(404)

    await request(app.getHttpServer())
      .delete(`/files/${file.id}`)
      .set('Cookie', emily)
      .expect(404)

    await request(app.getHttpServer())
      .get(`/files/${crypto.randomUUID()}/content`)
      .set('Cookie', sarah)
      .expect(404)
  })

  it('attaches to a post, lists the workspace file, and lets the uploader delete', async () => {
    const file = await uploadReady(app, sarah, DEMO_WORKSPACE_ID, 'board.jpg')
    const post = await request(app.getHttpServer())
      .post('/posts')
      .set('Cookie', sarah)
      .send({
        workspaceId: DEMO_WORKSPACE_ID,
        content: 'Deck attached',
        attachmentIds: [file.id]
      })
      .expect(201)
    expect(post.body.attachments[0].id).toBe(file.id)

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/files`)
      .set('Cookie', sarah)
      .expect(200)
    expect(
      listed.body.data.some((row: { id: string }) => row.id === file.id)
    ).toBe(true)

    await request(app.getHttpServer())
      .delete(`/files/${file.id}`)
      .set('Cookie', sarah)
      .expect(204)

    await request(app.getHttpServer())
      .get(`/files/${file.id}/content`)
      .set('Cookie', sarah)
      .expect(404)
  })

  it('rejects attaching a file that is still pending or belongs to someone else', async () => {
    const initiated = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/files`)
      .set('Cookie', sarah)
      .send({
        originalName: 'pending.jpg',
        contentType: 'image/jpeg',
        byteSize: 8
      })
      .expect(201)

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/conversations`)
      .set('Cookie', sarah)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    ) as { id: string }

    await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: 'nope',
        clientId: crypto.randomUUID(),
        attachmentIds: [initiated.body.file.id]
      })
      .expect(409)

    const jamesFile = await uploadReady(
      app,
      james,
      DEMO_WORKSPACE_ID,
      'james.jpg'
    )
    await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: 'stolen',
        clientId: crypto.randomUUID(),
        attachmentIds: [jamesFile.id]
      })
      .expect(409)
  })

  it('accepts recorded audio, plays it inline, and keeps other workspaces out', async () => {
    const oversized = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/files`)
      .set('Cookie', sarah)
      .send({
        originalName: 'clip.webm',
        contentType: 'video/webm',
        byteSize: 26 * 1024 * 1024
      })
      .expect(400)
    expect(oversized.body.code).toBe('VALIDATION')

    const initiated = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/files`)
      .set('Cookie', sarah)
      .send({
        originalName: 'voice.webm',
        contentType: 'audio/webm;codecs=opus',
        byteSize: 64
      })
      .expect(201)
    expect(initiated.body.file.contentType).toBe('audio/webm')

    const payload = Buffer.alloc(64, 7)
    await request(app.getHttpServer())
      .put(`/files/${initiated.body.file.id}/content`)
      .set('Cookie', sarah)
      .set('Content-Type', 'audio/webm')
      .send(payload)
      .expect(204)

    const completed = await request(app.getHttpServer())
      .post(`/files/${initiated.body.file.id}/complete`)
      .set('Cookie', sarah)
      .expect(200)

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/conversations`)
      .set('Cookie', sarah)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    ) as { id: string }

    const sent = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: '',
        clientId: crypto.randomUUID(),
        attachmentIds: [completed.body.id]
      })
      .expect(201)
    expect(sent.body.attachments[0].contentType).toBe('audio/webm')

    const played = await request(app.getHttpServer())
      .get(`/files/${completed.body.id}/content`)
      .set('Cookie', james)
      .expect(200)
    expect(played.headers['content-disposition']).toMatch(/inline/)
    expect(played.headers['content-type']).toMatch(/audio\/webm/)
    expect(
      Buffer.isBuffer(played.body) ? played.body.equals(payload) : false
    ).toBe(true)

    const privateWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Media Isolation' })
      .expect(201)

    const privateClip = await uploadReady(
      app,
      sarah,
      privateWs.body.id,
      'private.webm',
      'video/webm',
      32
    )

    await request(app.getHttpServer())
      .get(`/files/${privateClip.id}/content`)
      .set('Cookie', james)
      .expect(403)

    await request(app.getHttpServer())
      .delete(`/messages/${sent.body.id}`)
      .set('Cookie', james)
      .expect(403)

    const deleted = await request(app.getHttpServer())
      .delete(`/messages/${sent.body.id}`)
      .set('Cookie', sarah)
      .expect(200)
    expect(deleted.body.deletedAt).toBeTruthy()
  })
})
