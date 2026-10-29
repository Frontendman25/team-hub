import { Inject, Injectable } from '@nestjs/common'
import {
  readCookie,
  SESSION_COOKIE
} from '../../../infrastructure/http/cookies'
import { SESSIONS_REPOSITORY } from '../../auth/auth.tokens'
import type { SessionRepository } from '../../auth/domain/session.repository'
import { hashSessionToken } from '../../auth/infrastructure/session-token'

@Injectable()
export class SocketSessionService {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository
  ) {}

  async resolveUserId(
    cookieHeader: string | undefined
  ): Promise<string | null> {
    const token = readCookie(cookieHeader, SESSION_COOKIE)
    if (!token) {
      return null
    }
    const session = await this.sessions.findActiveByTokenHash(
      hashSessionToken(token)
    )
    return session?.userId ?? null
  }
}
