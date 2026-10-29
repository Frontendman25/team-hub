import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../infrastructure/config/env'
import { UnauthorizedError } from '../../../shared/domain/errors'
import { AUTH_USERS_REPOSITORY, SESSIONS_REPOSITORY } from '../auth.tokens'
import type { AuthUserRepository } from '../domain/auth-user.repository'
import type { SessionRepository } from '../domain/session.repository'
import { PasswordService } from '../infrastructure/password.service'
import { issueSession } from './issue-session'
import type { AuthResult } from './register.use-case'

export type LoginInput = {
  email: string
  password: string
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_USERS_REPOSITORY)
    private readonly users: AuthUserRepository,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<Env, true>
  ) {}

  async execute(input: LoginInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const user = await this.users.findLoginByEmail(email)
    const passwordOk = await this.passwords.verifyLogin(
      user?.passwordHash,
      input.password
    )

    if (!user || !passwordOk) {
      throw new UnauthorizedError('Invalid credentials')
    }

    if (user.accountKind === 'guest') {
      throw new UnauthorizedError('Invalid credentials')
    }

    const allowPersona = this.config.get('ALLOW_DEMO_PERSONA_LOGIN', {
      infer: true
    })
    if (user.accountKind === 'demo_persona' && !allowPersona) {
      throw new UnauthorizedError('Invalid credentials')
    }

    const session = await issueSession(
      this.sessions,
      user.id,
      this.config.get('SESSION_TTL_DAYS', { infer: true })
    )

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        jobTitle: user.jobTitle,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        accountKind: user.accountKind,
        guestExpiresAt: user.guestExpiresAt
      },
      session
    }
  }
}
