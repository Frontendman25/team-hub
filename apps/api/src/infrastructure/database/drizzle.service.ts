import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import type { Env } from '../config/env'
import { redactSqlParams } from '../http/redact'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name)
  private readonly client: Sql
  readonly db: Database

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('POSTGRESQL_URL', { infer: true })
    const sqlTrace = config.get('SQL_TRACE', { infer: true })

    this.client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    })

    this.db = drizzle(this.client, {
      schema,
      logger: sqlTrace
        ? {
            logQuery: (query, params) => {
              this.logger.debug(
                `SQL: ${query} — ${JSON.stringify(redactSqlParams(params))}`
              )
            }
          }
        : false
    })
  }

  async onModuleInit(): Promise<void> {
    await this.ping()
    this.logger.log('PostgreSQL connection established')
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 })
  }

  async ping(): Promise<void> {
    await this.client`select 1`
  }
}
