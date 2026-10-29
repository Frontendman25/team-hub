import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../infrastructure/config/env'
import { AUTH_USERS_REPOSITORY, SESSIONS_REPOSITORY } from '../auth.tokens'
import type {
  AuthUserRepository,
  PublicAuthUser
} from '../domain/auth-user.repository'
import type { SessionRepository } from '../domain/session.repository'
import { PasswordService } from '../infrastructure/password.service'
import { issueSession, type IssuedSession } from './issue-session'

export type RegisterInput = {
  email: string
  password: string
  displayName: string
  jobTitle?: string
  bio?: string
}

export type AuthResult = {
  user: PublicAuthUser
  session: IssuedSession
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(AUTH_USERS_REPOSITORY)
    private readonly users: AuthUserRepository,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<Env, true>
  ) {}

  async execute(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const passwordHash = await this.passwords.hash(input.password)
    const user = await this.users.create({
      email,
      passwordHash,
      displayName: input.displayName.trim(),
      jobTitle: input.jobTitle?.trim() || 'Team member',
      bio: input.bio?.trim() ?? ''
    })
    const session = await issueSession(
      this.sessions,
      user.id,
      this.config.get('SESSION_TTL_DAYS', { infer: true })
    )

    return { user, session }
  }
}
