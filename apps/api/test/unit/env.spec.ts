import { describe, expect, it } from 'vitest'
import { validateEnv } from '../../src/infrastructure/config/env'

const base = {
  POSTGRESQL_URL: 'postgresql://teamhub:teamhub@localhost:5435/teamhub',
  REDIS_URL: 'redis://localhost:6380'
}

describe('validateEnv', () => {
  it('defaults cookie Secure and Redis adapter for production', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      STORAGE_DRIVER: 's3',
      S3_ENDPOINT: 'http://minio:9000',
      S3_BUCKET: 'teamhub',
      S3_ACCESS_KEY_ID: 'teamhub',
      S3_SECRET_ACCESS_KEY: 'teamhubminio'
    })

    expect(env.COOKIE_SECURE).toBe(true)
    expect(env.TRUST_PROXY).toBe(true)
    expect(env.SOCKET_IO_REDIS_REQUIRED).toBe(true)
    expect(env.ALLOW_DEMO_PERSONA_LOGIN).toBe(false)
    expect(env.RUN_BACKGROUND_JOBS).toBe(true)
  })

  it('allows HTTP cookies when COOKIE_SECURE=false in production-like deploys', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
      STORAGE_DRIVER: 's3',
      S3_ENDPOINT: 'http://minio:9000',
      S3_BUCKET: 'teamhub',
      S3_ACCESS_KEY_ID: 'teamhub',
      S3_SECRET_ACCESS_KEY: 'teamhubminio'
    })

    expect(env.COOKIE_SECURE).toBe(false)
  })

  it('does not require the Socket.IO Redis adapter in development by default', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'development'
    })

    expect(env.SOCKET_IO_REDIS_REQUIRED).toBe(false)
    expect(env.COOKIE_SECURE).toBe(false)
    expect(env.ALLOW_DEMO_PERSONA_LOGIN).toBe(true)
  })
})
