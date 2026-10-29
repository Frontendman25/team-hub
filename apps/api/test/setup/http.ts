import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  DEMO_PASSWORD,
  demoUsers
} from '../../src/infrastructure/database/demo-users'

export async function loginAs(
  app: INestApplication,
  email = demoUsers[0].email,
  password = DEMO_PASSWORD
): Promise<string[]> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200)

  const setCookie = response.headers['set-cookie']
  const cookies = (
    Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  ).map((value) => value.split(';')[0] ?? value)
  if (cookies.length === 0) {
    throw new Error('Login did not set a session cookie')
  }
  return cookies
}
