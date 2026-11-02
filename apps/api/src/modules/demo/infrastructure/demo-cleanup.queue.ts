import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Queue } from 'bullmq'
import type { Env } from '../../../infrastructure/config/env'
import { RedisLifecycle } from '../../../infrastructure/redis/redis-lifecycle'
import { DEMO_CLEANUP_QUEUE } from '../demo.tokens'

export const DEMO_CLEANUP_QUEUE_NAME = 'teamhub-demo-cleanup'

@Injectable()
export class DemoCleanupQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DemoCleanupQueue.name)

  constructor(
    @Inject(DEMO_CLEANUP_QUEUE)
    private readonly queue: Queue,
    private readonly config: ConfigService<Env, true>,
    private readonly lifecycle: RedisLifecycle
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.waitUntilReady()
    this.lifecycle.onRestored(async () => {
      this.logger.warn(
        'Redis restored; re-adding demo cleanup schedule (Key Value is not durable)'
      )
      await this.ensureRepeatable()
    })
    await this.ensureRepeatable()
  }

  async ensureRepeatable(): Promise<void> {
    if (
      process.env.NODE_ENV === 'test' ||
      !this.config.get('RUN_BACKGROUND_JOBS', { infer: true })
    ) {
      return
    }
    await this.queue.add('purge-guests', {}, {
      jobId: 'demo-purge-guests',
      repeat: { every: 15 * 60 * 1000 },
      removeOnComplete: 20,
      removeOnFail: 20
    } as never)
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
  }
}
