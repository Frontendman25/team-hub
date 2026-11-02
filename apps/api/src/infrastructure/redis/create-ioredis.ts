import Redis from 'ioredis'
import { teamhubIoredisOptions } from './ioredis-options'
import type { RedisLifecycle } from './redis-lifecycle'

export function createTeamhubIoredis(
  redisUrl: string,
  lifecycle?: RedisLifecycle
): Redis {
  const client = new Redis(redisUrl, teamhubIoredisOptions())
  let initial = true
  client.on('ready', () => {
    if (initial) {
      initial = false
      return
    }
    void lifecycle?.notifyRestored('ioredis')
  })
  return client
}
