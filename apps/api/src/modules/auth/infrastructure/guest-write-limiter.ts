import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../infrastructure/redis/redis.service'
import {
  GUEST_WRITE_LIMIT,
  GUEST_WRITE_WINDOW_SECONDS
} from '../../demo/demo.constants'
import type { DemoPolicy } from '../../workspaces/application/demo-policy'
import { TooManyRequestsError } from '../../../shared/domain/errors'

@Injectable()
export class GuestWriteLimiter {
  private readonly logger = new Logger(GuestWriteLimiter.name)

  constructor(private readonly redis: RedisService) {}

  async assertAllow(actor: { id: string; accountKind: string }): Promise<void> {
    if (actor.accountKind !== 'guest') {
      return
    }
    if (process.env.NODE_ENV === 'test') {
      return
    }
    const key = `th:guest-write:${actor.id}`
    try {
      const count = await this.redis.incr(key)
      if (count === 1) {
        await this.redis.expire(key, GUEST_WRITE_WINDOW_SECONDS)
      }
      if (count > GUEST_WRITE_LIMIT) {
        throw new TooManyRequestsError(
          'Demo write limit reached — wait a minute or register for a private workspace'
        )
      }
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        throw error
      }
      this.logger.warn(
        `Guest limiter degraded: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  async assertFor(policy: DemoPolicy, actorId: string): Promise<void> {
    const actor = await policy.actor(actorId)
    await this.assertAllow(actor)
  }
}
