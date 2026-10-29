import { config } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from 'drizzle-kit'

config({ path: resolve(__dirname, '../../.env') })

const postgresqlUrl = process.env.POSTGRESQL_URL

if (!postgresqlUrl) {
  throw new Error('POSTGRESQL_URL is required for Drizzle Kit')
}

export default defineConfig({
  schema: './src/infrastructure/database/schema/index.ts',
  out: './src/infrastructure/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: postgresqlUrl
  }
})
