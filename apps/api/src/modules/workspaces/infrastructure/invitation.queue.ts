import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import type { Queue } from 'bullmq'
import { INVITATION_QUEUE } from '../workspaces.tokens'

export const INVITATION_QUEUE_NAME = 'teamhub-invitations'

@Injectable()
export class InvitationQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvitationQueue.name)

  constructor(
    @Inject(INVITATION_QUEUE)
    private readonly queue: Queue
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.waitUntilReady()
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
  }

  async enqueueNotify(invitationId: string): Promise<void> {
    try {
      await this.queue.add(
        'notify-invitee',
        { invitationId },
        {
          jobId: `invite-notify-${invitationId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50
        }
      )
    } catch (error) {
      this.logger.error(
        `Failed to enqueue invitation ${invitationId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      )
    }
  }
}
