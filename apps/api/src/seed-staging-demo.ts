import { loadEnv } from './infrastructure/config/load-env'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ensureStagingDemo } from './infrastructure/database/staging-demo'
import * as schema from './infrastructure/database/schema'

loadEnv()

async function main(): Promise<void> {
  const url = process.env.POSTGRESQL_URL
  if (!url) {
    throw new Error('POSTGRESQL_URL is required to initialize the staging demo')
  }

  const client = postgres(url)
  try {
    const db = drizzle(client, { schema })
    const result = await ensureStagingDemo(db)
    console.log(
      `Staging demo ready (workspace ${result.workspaceId}${result.createdOwner ? ', catalog owner created' : ''})`
    )
  } finally {
    await client.end({ timeout: 5 })
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
