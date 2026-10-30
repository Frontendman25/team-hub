import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import request from 'supertest'
import { io, type Socket } from 'socket.io-client'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import type { Env } from '../../src/infrastructure/config/env'
import { RedisIoAdapter } from '../../src/infrastructure/realtime/redis-io.adapter'
import { createTestDb, seedTestUsers, type TestDb } from '../setup/db'
import { loginAs } from '../setup/http'

function waitForEvent<T>(socket: Socket, event: string, timeout = 5000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeout)
    socket.once(event, (payload: T) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

describe('Messaging HTTP and sockets', () => {
  let app: INestApplication
  let testDb: TestDb
  let sarah: string[]
  let james: string[]
  let origin: string

  beforeAll(async () => {
    testDb = await createTestDb()
    await seedTestUsers(testDb.db)
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()
    app = moduleRef.createNestApplication()
    configureHttp(app)
    const config = app.get(ConfigService<Env, true>)
    const adapter = new RedisIoAdapter(
      app,
      config.get('FRONTEND_URL', { infer: true })
    )
    await adapter.connectToRedis(config.get('REDIS_URL', { infer: true }))
    app.useWebSocketAdapter(adapter)
    await app.listen(0)
    origin = await app.getUrl()
    sarah = await loginAs(app, 'sarah.chen@teamhub.local')
    james = await loginAs(app, 'james.parker@teamhub.local')
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  it('lists default channels, isolates workspaces, and is idempotent', async () => {
    const listed = await request(app.getHttpServer())
      .get('/workspaces/88888888-8888-4888-8888-888888888888/conversations')
      .set('Cookie', sarah)
      .expect(200)

    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    )
    expect(general).toBeTruthy()

    const clientId = crypto.randomUUID()
    const first = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({ content: 'Hello channel', clientId })
      .expect(201)
    const second = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({ content: 'Hello channel', clientId })
      .expect(201)
    expect(second.body.id).toBe(first.body.id)

    const other = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Private Lab' })
      .expect(201)

    const otherChannels = await request(app.getHttpServer())
      .get(`/workspaces/${other.body.id}/conversations`)
      .set('Cookie', sarah)
      .expect(200)
    const otherGeneral = otherChannels.body.data[0]

    await request(app.getHttpServer())
      .get(`/conversations/${otherGeneral.id}/messages`)
      .set('Cookie', james)
      .expect(403)

    await request(app.getHttpServer())
      .post(`/conversations/${otherGeneral.id}/messages`)
      .set('Cookie', james)
      .send({
        content: 'intrusion',
        clientId: crypto.randomUUID()
      })
      .expect(403)
  })

  it('allows authors to edit and admins to delete', async () => {
    const listed = await request(app.getHttpServer())
      .get('/workspaces/88888888-8888-4888-8888-888888888888/conversations')
      .set('Cookie', james)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    )

    const created = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', james)
      .send({
        content: 'Please edit me',
        clientId: crypto.randomUUID()
      })
      .expect(201)

    await request(app.getHttpServer())
      .patch(`/messages/${created.body.id}`)
      .set('Cookie', sarah)
      .send({ content: 'hijack' })
      .expect(403)

    const edited = await request(app.getHttpServer())
      .patch(`/messages/${created.body.id}`)
      .set('Cookie', james)
      .send({ content: 'Edited by James' })
      .expect(200)
    expect(edited.body.content).toBe('Edited by James')

    const deleted = await request(app.getHttpServer())
      .delete(`/messages/${created.body.id}`)
      .set('Cookie', sarah)
      .expect(200)
    expect(deleted.body.deletedAt).toBeTruthy()
  })

  it('authenticates sockets and delivers messages without refresh', async () => {
    const listed = await request(app.getHttpServer())
      .get('/workspaces/88888888-8888-4888-8888-888888888888/conversations')
      .set('Cookie', sarah)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    )

    const unauth = io(`${origin}/realtime`, {
      transports: ['websocket']
    })
    const unauthError = waitForEvent<{ code: string }>(unauth, 'error')
    await expect(unauthError).resolves.toMatchObject({ code: 'UNAUTHORIZED' })
    unauth.close()

    const sarahSocket = io(`${origin}/realtime`, {
      extraHeaders: { cookie: sarah.join('; ') },
      transports: ['websocket'],
      autoConnect: false
    })
    const jamesSocket = io(`${origin}/realtime`, {
      extraHeaders: { cookie: james.join('; ') },
      transports: ['websocket'],
      autoConnect: false
    })
    const sarahReady = waitForEvent(sarahSocket, 'session.ready')
    const jamesReady = waitForEvent(jamesSocket, 'session.ready')
    sarahSocket.connect()
    jamesSocket.connect()
    await Promise.all([sarahReady, jamesReady])
    await new Promise((resolve) =>
      sarahSocket.emit(
        'join.workspace',
        { workspaceId: '88888888-8888-4888-8888-888888888888' },
        resolve
      )
    )
    await new Promise((resolve) =>
      jamesSocket.emit(
        'join.workspace',
        { workspaceId: '88888888-8888-4888-8888-888888888888' },
        resolve
      )
    )
    await new Promise((resolve) =>
      jamesSocket.emit(
        'join.conversation',
        { conversationId: general.id },
        resolve
      )
    )

    const received = waitForEvent<{ content: string; clientId: string }>(
      jamesSocket,
      'message.created'
    )
    sarahSocket.emit('message.send', {
      conversationId: general.id,
      content: 'Live from Sarah',
      clientId: crypto.randomUUID()
    })
    await expect(received).resolves.toMatchObject({
      content: 'Live from Sarah'
    })

    jamesSocket.disconnect()
    const missed = `Missed ${crypto.randomUUID()}`
    await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: missed,
        clientId: crypto.randomUUID()
      })
      .expect(201)

    const history = await request(app.getHttpServer())
      .get(`/conversations/${general.id}/messages`)
      .set('Cookie', james)
      .expect(200)
    const contents = history.body.data.map(
      (row: { content: string }) => row.content
    )
    expect(contents.filter((value: string) => value === missed)).toHaveLength(1)

    sarahSocket.close()
    jamesSocket.close()
  })

  it('authenticates Engine.IO polling and still delivers live messages', async () => {
    const listed = await request(app.getHttpServer())
      .get('/workspaces/88888888-8888-4888-8888-888888888888/conversations')
      .set('Cookie', sarah)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    ) as { id: string }

    const sarahSocket = io(`${origin}/realtime`, {
      extraHeaders: { cookie: sarah.join('; ') },
      transports: ['polling', 'websocket'],
      rememberUpgrade: false,
      path: '/socket.io'
    })
    const jamesSocket = io(`${origin}/realtime`, {
      extraHeaders: { cookie: james.join('; ') },
      transports: ['polling', 'websocket'],
      rememberUpgrade: false,
      path: '/socket.io'
    })
    await Promise.all([
      waitForEvent(sarahSocket, 'session.ready'),
      waitForEvent(jamesSocket, 'session.ready')
    ])
    await new Promise((resolve) =>
      sarahSocket.emit(
        'join.workspace',
        { workspaceId: '88888888-8888-4888-8888-888888888888' },
        resolve
      )
    )
    await new Promise((resolve) =>
      jamesSocket.emit(
        'join.workspace',
        { workspaceId: '88888888-8888-4888-8888-888888888888' },
        resolve
      )
    )
    await new Promise((resolve) =>
      jamesSocket.emit(
        'join.conversation',
        { conversationId: general.id },
        resolve
      )
    )

    const received = waitForEvent<{ content: string }>(
      jamesSocket,
      'message.created'
    )
    sarahSocket.emit('message.send', {
      conversationId: general.id,
      content: 'Polling path live',
      clientId: crypto.randomUUID()
    })
    await expect(received).resolves.toMatchObject({
      content: 'Polling path live'
    })
    sarahSocket.close()
    jamesSocket.close()
  })

  it('fans HTTP edits and deletes out over the socket', async () => {
    const listed = await request(app.getHttpServer())
      .get('/workspaces/88888888-8888-4888-8888-888888888888/conversations')
      .set('Cookie', sarah)
      .expect(200)
    const general = listed.body.data.find(
      (row: { slug: string }) => row.slug === 'general'
    )

    const created = await request(app.getHttpServer())
      .post(`/conversations/${general.id}/messages`)
      .set('Cookie', sarah)
      .send({
        content: 'HTTP then edit',
        clientId: crypto.randomUUID()
      })
      .expect(201)

    const jamesSocket = io(`${origin}/realtime`, {
      extraHeaders: { cookie: james.join('; ') },
      transports: ['websocket'],
      autoConnect: false
    })
    const ready = waitForEvent(jamesSocket, 'session.ready')
    jamesSocket.connect()
    await ready
    await new Promise((resolve) =>
      jamesSocket.emit(
        'join.workspace',
        { workspaceId: '88888888-8888-4888-8888-888888888888' },
        resolve
      )
    )

    const updated = waitForEvent<{ content: string; id: string }>(
      jamesSocket,
      'message.updated'
    )
    await request(app.getHttpServer())
      .patch(`/messages/${created.body.id}`)
      .set('Cookie', sarah)
      .send({ content: 'Edited over HTTP' })
      .expect(200)
    await expect(updated).resolves.toMatchObject({
      id: created.body.id,
      content: 'Edited over HTTP'
    })

    const removed = waitForEvent<{ id: string; deletedAt: string }>(
      jamesSocket,
      'message.deleted'
    )
    await request(app.getHttpServer())
      .delete(`/messages/${created.body.id}`)
      .set('Cookie', sarah)
      .expect(200)
    await expect(removed).resolves.toMatchObject({
      id: created.body.id
    })

    const ackError = await new Promise<{ code: string; clientId: string }>(
      (resolve) => {
        const clientId = crypto.randomUUID()
        jamesSocket.emit(
          'message.send',
          {
            conversationId: general.id,
            content: '',
            clientId
          },
          resolve
        )
      }
    )
    expect(ackError.code).toBe('VALIDATION_ERROR')

    jamesSocket.close()
  })
})
