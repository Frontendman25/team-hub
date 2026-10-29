import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '../../.env') })

process.env.NODE_ENV = 'test'
process.env.PORT = process.env.PORT ?? '3201'
process.env.LOG_LEVEL = 'error'
process.env.SQL_TRACE = 'false'
process.env.POSTGRESQL_URL =
  process.env.TEST_POSTGRESQL_URL ??
  'postgresql://postgres:postgres@localhost:5436/teamhub_test'
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6380/1'
process.env.STORAGE_DRIVER = 'memory'
