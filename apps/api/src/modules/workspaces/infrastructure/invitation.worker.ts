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
import { NotifyInvitationUseCase } from '../application/notify-invitation.use-case'
import { INVITATION_QUEUE_NAME } from './invitation.queue'

@Injectable()
export class InvitationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvitationWorker.name)
  private worker: Worker | undefined
  private connection: Redis | undefined

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly notifyInvitation: NotifyInvitationUseCase
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('RUN_BACKGROUND_JOBS', { infer: true })) {
      this.logger.log('Invitation worker skipped (RUN_BACKGROUND_JOBS=false)')
      return
    }
    this.connection = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null
    })
    this.worker = new Worker(
      INVITATION_QUEUE_NAME,
      async (job) => {
        const invitationId = (job.data as { invitationId?: string })
          .invitationId
        if (!invitationId) {
          return
        }
        await this.notifyInvitation.execute(invitationId)
      },
      { connection: this.connection }
    )
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Invitation job ${job?.id ?? 'unknown'} failed: ${error.message}`
      )
    })
    this.worker.on('error', (error) => {
      this.logger.error(`Invitation worker error: ${error.message}`)
    })
    await this.worker.waitUntilReady()
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close()
    this.connection?.disconnect()
  }
}
