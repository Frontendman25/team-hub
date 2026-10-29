import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import { RedisHealthService } from '../../infrastructure/redis/redis-health.service'

@Controller()
export class HealthController {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisHealthService
  ) {}

  @Get()
  root() {
    return {
      name: 'TeamHub API',
      version: '0.1.0',
      endpoints: {
        health: '/health',
        healthLive: '/health/live',
        healthReady: '/health/ready',
        posts: '/posts',
        comments: '/posts/:id/comments',
        reactions: '/posts/:id/reactions',
        users: '/users',
        auth: '/auth',
        demo: '/auth/demo',
        workspaces: '/workspaces',
        invitations: '/invitations',
        notifications: '/notifications',
        stats: '/stats',
        search: '/workspaces/:workspaceId/search',
        files: '/workspaces/:workspaceId/files',
        tasks: '/workspaces/:workspaceId/tasks'
      }
    }
  }

  @Get('health/live')
  live() {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  }

  @Get('health/ready')
  async ready() {
    return this.readiness()
  }

  @Get('health')
  async health() {
    return this.readiness()
  }

  private async readiness() {
    const postgres = await this.check(() => this.drizzle.ping())
    const redis = await this.check(() => this.redis.ping())
    const healthy = postgres.ok && redis.ok

    const payload = {
      success: healthy,
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        postgres,
        redis
      }
    }

    if (!healthy) {
      throw new ServiceUnavailableException(payload)
    }

    return payload
  }

  private async check(
    ping: () => Promise<unknown>
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await ping()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
