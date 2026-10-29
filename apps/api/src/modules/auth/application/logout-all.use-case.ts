import { Inject, Injectable } from '@nestjs/common'
import { SESSIONS_REPOSITORY } from '../auth.tokens'
import type { SessionRepository } from '../domain/session.repository'

@Injectable()
export class LogoutAllUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository
  ) {}

  execute(userId: string): Promise<void> {
    return this.sessions.revokeAllForUser(userId)
  }
}
