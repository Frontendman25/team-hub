import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import { DEMO_WORKSPACE_ID } from '../../src/infrastructure/database/demo-users'
import { tasks } from '../../src/infrastructure/database/schema/tasks'
import {
  clearTasks,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'
import { loginAs } from '../setup/http'

describe('Tasks HTTP', () => {
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

  beforeEach(async () => {
    await clearTasks(testDb.db)
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  async function createTask(
    cookie: string[],
    body: Record<string, unknown> = {}
  ) {
    const response = await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', cookie)
      .send({
        title: 'Card',
        ...body
      })
      .expect(201)
    return response.body as {
      id: string
      version: number
      position: number
      status: string
    }
  }

  it('requires a session to read the board', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .expect(401)
  })

  it('creates, lists, updates, and deletes with workspace isolation', async () => {
    const created = await createTask(sarah, {
      title: 'Write copy',
      description: 'Short empty states',
      priority: 'high',
      assigneeId: '22222222-2222-4222-8222-222222222222'
    })
    expect(created.position).toBe(0)

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', james)
      .expect(200)
    expect(listed.body.data).toHaveLength(1)

    const patched = await request(app.getHttpServer())
      .patch(`/tasks/${created.id}`)
      .set('Cookie', sarah)
      .send({ title: 'Write board copy', version: created.version })
      .expect(200)
    expect(patched.body.title).toBe('Write board copy')
    expect(patched.body.version).toBe(created.version + 1)

    await request(app.getHttpServer())
      .patch(`/tasks/${created.id}`)
      .set('Cookie', sarah)
      .send({ title: 'stale write', version: created.version })
      .expect(409)

    const privateWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', sarah)
      .send({ name: 'Board Lab' })
      .expect(201)

    await request(app.getHttpServer())
      .get(`/workspaces/${privateWs.body.id}/tasks`)
      .set('Cookie', james)
      .expect(403)

    const hidden = await request(app.getHttpServer())
      .post(`/workspaces/${privateWs.body.id}/tasks`)
      .set('Cookie', sarah)
      .send({ title: 'Secret card' })
      .expect(201)

    await request(app.getHttpServer())
      .get(`/tasks/${hidden.body.id}`)
      .set('Cookie', james)
      .expect(403)

    await request(app.getHttpServer())
      .delete(`/tasks/${created.id}`)
      .set('Cookie', emily)
      .expect(403)

    await request(app.getHttpServer())
      .delete(`/tasks/${created.id}`)
      .set('Cookie', sarah)
      .expect(204)
  })

  it('rejects assigning a user who is not in the workspace', async () => {
    const outsiderWs = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', emily)
      .send({ name: 'Emily Only' })
      .expect(201)
    const outsiderMembers = await request(app.getHttpServer())
      .get(`/workspaces/${outsiderWs.body.id}/members`)
      .set('Cookie', emily)
      .expect(200)
    expect(outsiderMembers.body.data[0].userId).toBe(
      '33333333-3333-4333-8333-333333333333'
    )

    await request(app.getHttpServer())
      .post(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', sarah)
      .send({
        title: 'Assign outsider',
        assigneeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      })
      .expect(400)
  })

  it('moves cards between columns and keeps positions dense', async () => {
    const a = await createTask(sarah, { title: 'A', status: 'todo' })
    const b = await createTask(sarah, { title: 'B', status: 'todo' })
    const c = await createTask(sarah, { title: 'C', status: 'todo' })
    expect([a.position, b.position, c.position]).toEqual([0, 1, 2])

    await request(app.getHttpServer())
      .post(`/tasks/${c.id}/move`)
      .set('Cookie', james)
      .send({ status: 'in_progress', position: 0, version: c.version })
      .expect(201)

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', sarah)
      .expect(200)
    const todo = listed.body.data.filter(
      (row: { status: string }) => row.status === 'todo'
    )
    const progress = listed.body.data.filter(
      (row: { status: string }) => row.status === 'in_progress'
    )
    expect(todo.map((row: { title: string }) => row.title).sort()).toEqual([
      'A',
      'B'
    ])
    expect(
      todo.map((row: { position: number }) => row.position).sort()
    ).toEqual([0, 1])
    expect(progress).toHaveLength(1)
    expect(progress[0].title).toBe('C')
    expect(progress[0].position).toBe(0)
  })

  it('serializes concurrent moves without duplicate positions', async () => {
    const first = await createTask(sarah, { title: 'One' })
    const second = await createTask(sarah, { title: 'Two' })
    const third = await createTask(sarah, { title: 'Three' })

    const [left, right] = await Promise.all([
      request(app.getHttpServer())
        .post(`/tasks/${first.id}/move`)
        .set('Cookie', sarah)
        .send({ status: 'done', position: 0, version: first.version }),
      request(app.getHttpServer())
        .post(`/tasks/${second.id}/move`)
        .set('Cookie', james)
        .send({ status: 'done', position: 0, version: second.version })
    ])
    expect([left.status, right.status].sort()).toEqual([201, 201])

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', sarah)
      .expect(200)
    const done = listed.body.data
      .filter((row: { status: string }) => row.status === 'done')
      .sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      )
    const positions = done.map((row: { position: number }) => row.position)
    expect(new Set(positions).size).toBe(positions.length)
    expect(positions).toEqual(
      positions.map((_: number, index: number) => index)
    )
    expect(
      listed.body.data.filter((row: { id: string }) => row.id === third.id)
    ).toHaveLength(1)
  })

  it('rolls back a failed transaction and leaves positions unchanged', async () => {
    const first = await createTask(sarah, { title: 'Keep' })
    await createTask(sarah, { title: 'Stay' })
    await expect(
      testDb.db.transaction(async (tx) => {
        await tx
          .update(tasks)
          .set({ position: 99 })
          .where(sql`${tasks.id} = ${first.id}`)
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${DEMO_WORKSPACE_ID}/tasks`)
      .set('Cookie', sarah)
      .expect(200)
    const positions = listed.body.data.map(
      (row: { position: number }) => row.position
    )
    expect(positions.sort()).toEqual([0, 1])
    expect(
      listed.body.data.find((row: { id: string }) => row.id === first.id)
        ?.position
    ).toBe(0)
  })
})
