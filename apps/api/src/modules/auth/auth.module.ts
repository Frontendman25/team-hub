import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import type { IncomingMessage } from 'node:http'
import type { Env } from '../../infrastructure/config/env'
import { DrizzleService } from '../../infrastructure/database/drizzle.service'
import {
  parseTrustedProxyIps,
  resolveClientIp
} from '../../infrastructure/http/client-ip'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { LoginUseCase } from './application/login.use-case'
import { LogoutAllUseCase } from './application/logout-all.use-case'
import { LogoutUseCase } from './application/logout.use-case'
import { RegisterUseCase } from './application/register.use-case'
import { StartDemoUseCase } from './application/start-demo.use-case'
import { AUTH_USERS_REPOSITORY, SESSIONS_REPOSITORY } from './auth.tokens'
import type { AuthUserRepository } from './domain/auth-user.repository'
import type { SessionRepository } from './domain/session.repository'
import { DrizzleAuthUserRepository } from './infrastructure/drizzle-auth-user.repository'
import { DrizzleSessionRepository } from './infrastructure/drizzle-session.repository'
import { PasswordService } from './infrastructure/password.service'
import { SessionHydrationMiddleware } from './infrastructure/session-hydration.middleware'
import { AuthController } from './presentation/auth.controller'

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ ttl: 60_000, limit: 20 }],
        getTracker: (req: Record<string, unknown>) =>
          resolveClientIp(req as unknown as IncomingMessage, {
            trustedProxyIps: parseTrustedProxyIps(
              config.get('TRUSTED_PROXY_IPS', { infer: true })
            ),
            proxySecret: config.get('AUTH_PROXY_SECRET', { infer: true })
          })
      })
    }),
    WorkspacesModule
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_USERS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): AuthUserRepository =>
        new DrizzleAuthUserRepository(drizzle.db),
      inject: [DrizzleService]
    },
    {
      provide: SESSIONS_REPOSITORY,
      useFactory: (drizzle: DrizzleService): SessionRepository =>
        new DrizzleSessionRepository(drizzle.db),
      inject: [DrizzleService]
    },
    PasswordService,
    RegisterUseCase,
    LoginUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    StartDemoUseCase,
    SessionHydrationMiddleware
  ],
  exports: [SESSIONS_REPOSITORY]
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SessionHydrationMiddleware).forRoutes('*')
  }
}
