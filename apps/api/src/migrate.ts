import { loadEnv } from './infrastructure/config/load-env'
import { runMigrations } from './infrastructure/database/run-migrations'

loadEnv()

async function main(): Promise<void> {
  const url = process.env.POSTGRESQL_URL
  if (!url) {
    throw new Error('POSTGRESQL_URL is required to run migrations')
  }

  await runMigrations(url)
  console.log('PostgreSQL migrations applied')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
