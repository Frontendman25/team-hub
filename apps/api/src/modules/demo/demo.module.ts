import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import type { Env } from '../../infrastructure/config/env'
import { createTeamhubIoredis } from '../../infrastructure/redis/create-ioredis'
import { RedisLifecycle } from '../../infrastructure/redis/redis-lifecycle'
import { FilesModule } from '../files/files.module'
import { CleanupDemoGuestsUseCase } from './application/cleanup-demo-guests.use-case'
import { DEMO_CLEANUP_QUEUE } from './demo.tokens'
import {
  DemoCleanupQueue,
  DEMO_CLEANUP_QUEUE_NAME
} from './infrastructure/demo-cleanup.queue'
import { DemoCleanupWorker } from './infrastructure/demo-cleanup.worker'

@Module({
  imports: [FilesModule],
  providers: [
    {
      provide: DEMO_CLEANUP_QUEUE,
      useFactory: (
        config: ConfigService<Env, true>,
        lifecycle: RedisLifecycle
      ) => {
        const connection = createTeamhubIoredis(
          config.get('REDIS_URL', { infer: true }),
          lifecycle
        )
        return new Queue(DEMO_CLEANUP_QUEUE_NAME, { connection })
      },
      inject: [ConfigService, RedisLifecycle]
    },
    CleanupDemoGuestsUseCase,
    DemoCleanupQueue,
    DemoCleanupWorker
  ],
  exports: [CleanupDemoGuestsUseCase]
})
export class DemoModule {
  constructor(
    private readonly _queue: DemoCleanupQueue,
    private readonly _worker: DemoCleanupWorker
  ) {}
}
