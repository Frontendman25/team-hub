import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import type { Env } from '../../infrastructure/config/env'
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
      useFactory: (config: ConfigService<Env, true>) => {
        const connection = new Redis(config.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: null
        })
        return new Queue(DEMO_CLEANUP_QUEUE_NAME, { connection })
      },
      inject: [ConfigService]
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
