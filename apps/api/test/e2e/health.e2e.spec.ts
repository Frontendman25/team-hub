import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import { createTestDb, type TestDb } from '../setup/db'

describe('Health HTTP', () => {
  let app: INestApplication
  let testDb: TestDb

  beforeAll(async () => {
    testDb = await createTestDb()
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleRef.createNestApplication()
    configureHttp(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  it('reports liveness without dependency payloads', async () => {
    const response = await request(app.getHttpServer()).get('/health/live')
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.body.checks).toBeUndefined()
  })

  it('reports readiness including postgres and redis', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready')
    expect(response.status).toBe(200)
    expect(response.body.checks.postgres.ok).toBe(true)
    expect(response.body.checks.redis.ok).toBe(true)
  })
})
