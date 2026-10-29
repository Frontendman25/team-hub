import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import type { Env } from '../../../infrastructure/config/env'
import {
  SESSION_COOKIE,
  readCookie,
  sessionCookieBase
} from '../../../infrastructure/http/cookies'
import type { TeamHubRequest } from '../../../infrastructure/http/request'
import { CurrentUser } from '../../../infrastructure/identity/current-user.decorator'
import { SessionAuthGuard } from '../../../infrastructure/identity/session-auth.guard'
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe'
import { LoginUseCase } from '../application/login.use-case'
import { LogoutAllUseCase } from '../application/logout-all.use-case'
import { LogoutUseCase } from '../application/logout.use-case'
import { RegisterUseCase } from '../application/register.use-case'
import { StartDemoUseCase } from '../application/start-demo.use-case'
import {
  loginBodySchema,
  registerBodySchema,
  type LoginBody,
  type RegisterBody
} from './auth.schemas'

@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly registerUser: RegisterUseCase,
    private readonly loginUser: LoginUseCase,
    private readonly logoutUser: LogoutUseCase,
    private readonly logoutAll: LogoutAllUseCase,
    private readonly startDemo: StartDemoUseCase
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerBodySchema)) body: RegisterBody,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.registerUser.execute(body)
    this.setSessionCookie(
      response,
      result.session.rawToken,
      result.session.expiresAt
    )
    return result.user
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginBodySchema)) body: LoginBody,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.loginUser.execute(body)
    this.setSessionCookie(
      response,
      result.session.rawToken,
      result.session.expiresAt
    )
    return result.user
  }

  @Post('demo')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 8, ttl: 600_000 } })
  async demo(
    @Req() request: TeamHubRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.startDemo.execute(request.userId)
    this.setSessionCookie(
      response,
      result.session.rawToken,
      result.session.expiresAt
    )
    return result.user
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: TeamHubRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE)
    await this.logoutUser.execute(token)
    this.clearSessionCookie(response)
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logoutEveryDevice(
    @CurrentUser() userId: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    await this.logoutAll.execute(userId)
    this.clearSessionCookie(response)
  }

  private setSessionCookie(
    response: Response,
    token: string,
    expiresAt: Date
  ): void {
    response.cookie(
      SESSION_COOKIE,
      token,
      sessionCookieBase({
        secure: this.config.get('COOKIE_SECURE', { infer: true }),
        domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
        maxAgeMs: Math.max(0, expiresAt.getTime() - Date.now())
      })
    )
  }

  private clearSessionCookie(response: Response): void {
    response.clearCookie(
      SESSION_COOKIE,
      sessionCookieBase({
        secure: this.config.get('COOKIE_SECURE', { infer: true }),
        domain: this.config.get('COOKIE_DOMAIN', { infer: true })
      })
    )
  }
}
