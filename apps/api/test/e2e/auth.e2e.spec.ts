import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureHttp } from '../../src/configure-http'
import { DEMO_PASSWORD } from '../../src/infrastructure/database/demo-users'
import { sessions } from '../../src/infrastructure/database/schema/sessions'
import { hashSessionToken } from '../../src/modules/auth/infrastructure/session-token'
import {
  clearSessions,
  createTestDb,
  seedTestUsers,
  type TestDb
} from '../setup/db'
import { loginAs } from '../setup/http'

describe('Auth HTTP', () => {
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
  })

  afterAll(async () => {
    await app.close()
    await testDb.client.end({ timeout: 5 })
  })

  it('registers a user, sets a session cookie, and returns /users/me', async () => {
    const email = `new.user.${Date.now()}@teamhub.local`
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Password12',
        displayName: 'New Person',
        jobTitle: 'Design'
      })
      .expect(201)

    expect(register.body.email).toBe(email)
    expect(register.body.passwordHash).toBeUndefined()
    const cookies = register.headers['set-cookie']
    expect(cookies).toBeTruthy()

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', cookies)
      .expect(200)

    expect(me.body.displayName).toBe('New Person')
  })

  it('rejects duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'sarah.chen@teamhub.local',
        password: 'Password12',
        displayName: 'Clone'
      })
      .expect(409)
  })

  it('rejects invalid credentials with a generic message', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'sarah.chen@teamhub.local',
        password: 'wrong-password'
      })
      .expect(401)

    expect(response.body.message).toBe('Invalid credentials')
  })

  it('rejects an unknown email with the same generic message', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nobody@teamhub.local',
        password: 'Password12'
      })
      .expect(401)

    expect(response.body.message).toBe('Invalid credentials')
  })

  it('logs in a seeded user and restores the session', async () => {
    const cookies = await loginAs(app)
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', cookies)
      .expect(200)

    expect(me.body.email).toBe('sarah.chen@teamhub.local')
    expect(me.body.displayName).toBe('Sarah Chen')
  })

  it('logout revokes the current session', async () => {
    const cookies = await loginAs(app)
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookies)
      .expect(204)

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', cookies)
      .expect(401)
  })

  it('logout-all revokes every session for the user', async () => {
    const first = await loginAs(app)
    const second = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'sarah.chen@teamhub.local',
        password: DEMO_PASSWORD
      })
      .expect(200)
    const secondCookies = second.headers['set-cookie']

    await request(app.getHttpServer())
      .post('/auth/logout-all')
      .set('Cookie', first)
      .expect(204)

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', first)
      .expect(401)
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', secondCookies)
      .expect(401)
  })

  it('rejects forged session cookies', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', 'th.sid=not-a-real-session')
      .expect(401)
  })

  it('rejects an expired session', async () => {
    const cookies = await loginAs(app)
    const rawToken = decodeURIComponent(
      cookies[0]?.slice('th.sid='.length) ?? ''
    )
    expect(rawToken.length).toBeGreaterThan(0)

    await testDb.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(sessions.tokenHash, hashSessionToken(rawToken)))

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', cookies)
      .expect(401)
  })
})
