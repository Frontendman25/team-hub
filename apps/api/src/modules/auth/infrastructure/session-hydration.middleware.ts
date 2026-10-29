import { Inject, Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Response } from 'express'
import {
  SESSION_COOKIE,
  readCookie
} from '../../../infrastructure/http/cookies'
import type { TeamHubRequest } from '../../../infrastructure/http/request'
import { SESSIONS_REPOSITORY } from '../auth.tokens'
import type { SessionRepository } from '../domain/session.repository'
import { hashSessionToken } from './session-token'

@Injectable()
export class SessionHydrationMiddleware implements NestMiddleware {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository
  ) {}

  async use(
    request: TeamHubRequest,
    _response: Response,
    next: NextFunction
  ): Promise<void> {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE)
    if (!token) {
      next()
      return
    }

    const session = await this.sessions.findActiveByTokenHash(
      hashSessionToken(token)
    )
    if (session) {
      request.userId = session.userId
    }

    next()
  }
}
