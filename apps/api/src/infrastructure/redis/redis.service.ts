import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type RedisClientType } from 'redis'
import type { Env } from '../config/env'
import { RedisLifecycle } from './redis-lifecycle'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: RedisClientType
  private sawReady = false

  constructor(
    config: ConfigService<Env, true>,
    private readonly lifecycle: RedisLifecycle
  ) {
    this.client = createClient({
      url: config.get('REDIS_URL', { infer: true }),
      socket: {
        reconnectStrategy: (retries) => Math.min(200 * retries, 2000)
      }
    })
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis error: ${error.message}`)
    })
    this.client.on('ready', () => {
      if (!this.sawReady) {
        this.sawReady = true
        return
      }
      void this.lifecycle.notifyRestored('node-redis')
    })
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect()
    this.logger.log('Redis connection established')
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }

  async ping(): Promise<string> {
    return this.client.ping()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { EX: ttlSeconds })
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds)
  }

  async sadd(key: string, member: string): Promise<void> {
    await this.client.sAdd(key, member)
  }

  async srem(key: string, member: string): Promise<void> {
    await this.client.sRem(key, member)
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.sMembers(key)
  }
}
