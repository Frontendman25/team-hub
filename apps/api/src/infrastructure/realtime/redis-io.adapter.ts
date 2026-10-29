import { INestApplication, Logger } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { Server, ServerOptions } from 'socket.io'

export class RedisIoAdapter extends IoAdapter {
  private readonly log = new Logger(RedisIoAdapter.name)
  private adapterFactory: ReturnType<typeof createAdapter> | undefined

  constructor(
    app: INestApplication,
    private readonly frontendUrl: string
  ) {
    super(app)
  }

  isAttached(): boolean {
    return Boolean(this.adapterFactory)
  }

  async connectToRedis(redisUrl: string): Promise<void> {
    const pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 10_000
    })
    const subClient = pubClient.duplicate()
    try {
      await Promise.all([whenReady(pubClient), whenReady(subClient)])
      this.adapterFactory = createAdapter(pubClient, subClient)
      this.log.log('Socket.IO Redis adapter attached')
    } catch (error) {
      pubClient.disconnect()
      subClient.disconnect()
      const message =
        error instanceof Error ? error.message : 'unknown Redis error'
      throw new Error(`Socket.IO Redis adapter failed: ${message}`)
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.frontendUrl,
        credentials: true
      }
    }) as Server
    if (this.adapterFactory) {
      server.adapter(this.adapterFactory)
    }
    return server
  }
}

function whenReady(client: Redis, timeoutMs = 10_000): Promise<void> {
  if (client.status === 'ready') {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('ready', onReady)
      client.off('error', onError)
      reject(new Error(`Redis ready timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    const onReady = () => {
      clearTimeout(timer)
      client.off('error', onError)
      resolve()
    }
    const onError = (error: Error) => {
      clearTimeout(timer)
      client.off('ready', onReady)
      reject(error)
    }

    client.once('ready', onReady)
    client.once('error', onError)
  })
}
