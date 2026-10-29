import { Global, Module } from '@nestjs/common'
import { RedisHealthService } from './redis-health.service'
import { RedisService } from './redis.service'

@Global()
@Module({
  providers: [RedisService, RedisHealthService],
  exports: [RedisService, RedisHealthService]
})
export class RedisModule {}
