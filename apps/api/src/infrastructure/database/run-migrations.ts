import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export function migrationsFolder(): string {
  return join(__dirname, 'migrations')
}

export async function runMigrations(postgresqlUrl: string): Promise<void> {
  const client = postgres(postgresqlUrl, { max: 1 })
  try {
    const db = drizzle(client)
    await migrate(db, { migrationsFolder: migrationsFolder() })
  } finally {
    await client.end({ timeout: 5 })
  }
}
