import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../infrastructure/redis/redis.service'

const WINDOW_SECONDS = 10 * 60
const MAX_UPLOADS = 20

@Injectable()
export class UploadRateLimiter {
  private readonly logger = new Logger(UploadRateLimiter.name)

  constructor(private readonly redis: RedisService) {}

  async allow(userId: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      return true
    }
    const key = `th:file-rate:${userId}`
    try {
      const count = await this.redis.incr(key)
      if (count === 1) {
        await this.redis.expire(key, WINDOW_SECONDS)
      }
      return count <= MAX_UPLOADS
    } catch (error) {
      this.logger.warn(
        `Upload rate limiter degraded: ${error instanceof Error ? error.message : 'unknown'}`
      )
      return true
    }
  }
}
