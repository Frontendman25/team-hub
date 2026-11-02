import { Global, Module } from '@nestjs/common'
import { RedisHealthService } from './redis-health.service'
import { RedisLifecycle } from './redis-lifecycle'
import { RedisService } from './redis.service'

@Global()
@Module({
  providers: [RedisLifecycle, RedisService, RedisHealthService],
  exports: [RedisLifecycle, RedisService, RedisHealthService]
})
export class RedisModule {}
