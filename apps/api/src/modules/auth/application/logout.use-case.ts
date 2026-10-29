import { Inject, Injectable } from '@nestjs/common'
import { SESSIONS_REPOSITORY } from '../auth.tokens'
import type { SessionRepository } from '../domain/session.repository'
import { hashSessionToken } from '../infrastructure/session-token'

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository
  ) {}

  async execute(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return
    }

    const session = await this.sessions.findActiveByTokenHash(
      hashSessionToken(rawToken)
    )
    if (session) {
      await this.sessions.revokeById(session.id)
    }
  }
}
