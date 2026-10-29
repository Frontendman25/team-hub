import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../infrastructure/redis/redis.service'

const USER_TTL_SECONDS = 45

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name)

  constructor(private readonly redis: RedisService) {}

  async heartbeat(userId: string, workspaceId: string): Promise<void> {
    try {
      await this.redis.set(
        this.userKey(workspaceId, userId),
        '1',
        USER_TTL_SECONDS
      )
      await this.redis.sadd(this.setKey(workspaceId), userId)
    } catch (error) {
      this.logger.warn(
        `Presence heartbeat failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  async disconnect(userId: string, workspaceId: string): Promise<void> {
    try {
      await this.redis.del(this.userKey(workspaceId, userId))
      await this.redis.srem(this.setKey(workspaceId), userId)
    } catch (error) {
      this.logger.warn(
        `Presence disconnect failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  async listOnline(workspaceId: string): Promise<string[]> {
    try {
      const members = await this.redis.smembers(this.setKey(workspaceId))
      const live: string[] = []
      for (const userId of members) {
        const online = await this.redis.exists(
          this.userKey(workspaceId, userId)
        )
        if (online) {
          live.push(userId)
        } else {
          await this.redis.srem(this.setKey(workspaceId), userId)
        }
      }
      return live
    } catch (error) {
      this.logger.warn(
        `Presence list failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
      return []
    }
  }

  private userKey(workspaceId: string, userId: string): string {
    return `th:presence:${workspaceId}:${userId}`
  }

  private setKey(workspaceId: string): string {
    return `th:presence:ws:${workspaceId}`
  }
}
