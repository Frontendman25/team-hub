import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../infrastructure/redis/redis.service'

const WINDOW_SECONDS = 10
const MAX_MESSAGES = 30

@Injectable()
export class MessageRateLimiter {
  private readonly logger = new Logger(MessageRateLimiter.name)

  constructor(private readonly redis: RedisService) {}

  async allow(userId: string): Promise<boolean> {
    const key = `th:msg-rate:${userId}`
    try {
      const count = await this.redis.incr(key)
      if (count === 1) {
        await this.redis.expire(key, WINDOW_SECONDS)
      }
      return count <= MAX_MESSAGES
    } catch (error) {
      this.logger.warn(
        `Rate limiter degraded: ${error instanceof Error ? error.message : 'unknown'}`
      )
      return true
    }
  }
}
