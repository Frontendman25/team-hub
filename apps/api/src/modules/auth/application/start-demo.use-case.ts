import { randomBytes, randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../infrastructure/config/env'
import { DEMO_WORKSPACE_ID } from '../../../infrastructure/database/demo-users'
import { NotFoundError } from '../../../shared/domain/errors'
import type { WorkspaceRepository } from '../../workspaces/domain/workspace.repository'
import { WORKSPACES_REPOSITORY } from '../../workspaces/workspaces.tokens'
import { AUTH_USERS_REPOSITORY, SESSIONS_REPOSITORY } from '../auth.tokens'
import type { AuthUserRepository } from '../domain/auth-user.repository'
import type { SessionRepository } from '../domain/session.repository'
import { PasswordService } from '../infrastructure/password.service'
import { issueSession } from './issue-session'
import type { AuthResult } from './register.use-case'

@Injectable()
export class StartDemoUseCase {
  constructor(
    @Inject(AUTH_USERS_REPOSITORY)
    private readonly users: AuthUserRepository,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionRepository,
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: WorkspaceRepository,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<Env, true>
  ) {}

  async execute(actorId?: string): Promise<AuthResult> {
    const demo = await this.requireDemoWorkspace()
    if (actorId) {
      const existing = await this.users.findById(actorId)
      if (existing?.accountKind === 'guest') {
        const hours = this.config.get('GUEST_SESSION_HOURS', { infer: true })
        const guestExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
        await this.users.extendGuestExpiry(existing.id, guestExpiresAt)
        const session = await issueSession(
          this.sessions,
          existing.id,
          hours / 24
        )
        return {
          user: { ...existing, guestExpiresAt },
          session
        }
      }
      if (existing?.accountKind === 'registered') {
        await this.workspaces.addMember(demo.id, existing.id, 'member')
        const session = await issueSession(
          this.sessions,
          existing.id,
          this.config.get('SESSION_TTL_DAYS', { infer: true })
        )
        return { user: existing, session }
      }
    }

    const guestId = randomUUID()
    const hours = this.config.get('GUEST_SESSION_HOURS', { infer: true })
    const guestExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    const passwordHash = await this.passwords.hash(
      randomBytes(32).toString('hex')
    )
    const user = await this.users.create({
      email: `guest.${guestId.replaceAll('-', '')}@demo.invalid`,
      passwordHash,
      displayName: `Visitor ${guestId.slice(0, 4)}`,
      jobTitle: 'Demo visitor',
      bio: '',
      accountKind: 'guest',
      guestExpiresAt
    })
    await this.workspaces.addMember(demo.id, user.id, 'member')
    const session = await issueSession(this.sessions, user.id, hours / 24)
    return { user, session }
  }

  private async requireDemoWorkspace() {
    const demo = await this.workspaces.findById(DEMO_WORKSPACE_ID)
    if (!demo || demo.kind !== 'demo') {
      throw new NotFoundError('Public demo is not available')
    }
    return demo
  }
}
