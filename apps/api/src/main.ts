import 'reflect-metadata'
import { loadEnv } from './infrastructure/config/load-env'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { configureHttp } from './configure-http'
import type { Env } from './infrastructure/config/env'
import { RedisIoAdapter } from './infrastructure/realtime/redis-io.adapter'

loadEnv()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  configureHttp(app)
  const config = app.get(ConfigService<Env, true>)
  const adapter = new RedisIoAdapter(
    app,
    config.get('FRONTEND_URL', { infer: true })
  )
  const redisUrl = config.get('REDIS_URL', { infer: true })
  const redisRequired = config.get('SOCKET_IO_REDIS_REQUIRED', { infer: true })
  try {
    await adapter.connectToRedis(redisUrl)
  } catch (error) {
    if (redisRequired) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'unknown'
    new Logger('Bootstrap').warn(
      `Socket.IO Redis adapter skipped (SOCKET_IO_REDIS_REQUIRED=false): ${message}`
    )
  }
  app.useWebSocketAdapter(adapter)
  app.enableShutdownHooks()

  const port = Number(process.env.PORT ?? 3200)
  await app.listen(port)
}

void bootstrap()
