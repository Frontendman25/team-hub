import { Injectable } from '@nestjs/common'
import { RedisService } from './redis.service'

@Injectable()
export class RedisHealthService {
  constructor(private readonly redis: RedisService) {}

  ping(): Promise<string> {
    return this.redis.ping()
  }
}
