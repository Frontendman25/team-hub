import type { RedisOptions } from 'ioredis'

export function teamhubIoredisOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      return Math.min(200 * times, 2000)
    }
  }
}
