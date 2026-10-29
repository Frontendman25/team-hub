import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Worker } from 'bullmq'
import Redis from 'ioredis'
import type { Env } from '../../../infrastructure/config/env'
import { CleanupDemoGuestsUseCase } from '../application/cleanup-demo-guests.use-case'
import { DEMO_CLEANUP_QUEUE_NAME } from './demo-cleanup.queue'

@Injectable()
export class DemoCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DemoCleanupWorker.name)
  private worker: Worker | undefined
  private connection: Redis | undefined

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly cleanup: CleanupDemoGuestsUseCase
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('RUN_BACKGROUND_JOBS', { infer: true })) {
      this.logger.log('Demo cleanup worker skipped (RUN_BACKGROUND_JOBS=false)')
      return
    }
    this.connection = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null
    })
    this.worker = new Worker(
      DEMO_CLEANUP_QUEUE_NAME,
      async () => {
        await this.cleanup.execute()
      },
      { connection: this.connection }
    )
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Demo cleanup ${job?.id ?? 'unknown'} failed: ${error.message}`
      )
    })
    await this.worker.waitUntilReady()
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close()
    this.connection?.disconnect()
  }
}
