import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../infrastructure/redis/redis.service'

export const UNREAD_COUNT_TTL_SECONDS = 60

@Injectable()
export class UnreadCountCache {
  private readonly logger = new Logger(UnreadCountCache.name)

  constructor(private readonly redis: RedisService) {}

  key(userId: string): string {
    return `th:unread:${userId}`
  }

  async read(userId: string): Promise<number | null> {
    try {
      const value = await this.redis.get(this.key(userId))
      if (value === null) {
        return null
      }
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    } catch (error) {
      this.logger.warn(
        `Unread cache GET failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
      return null
    }
  }

  async write(userId: string, count: number): Promise<void> {
    try {
      await this.redis.set(
        this.key(userId),
        String(count),
        UNREAD_COUNT_TTL_SECONDS
      )
    } catch (error) {
      this.logger.warn(
        `Unread cache SET failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      await this.redis.del(this.key(userId))
    } catch (error) {
      this.logger.warn(
        `Unread cache DEL failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }
}
