import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedError } from '../../src/shared/domain/errors'
import { LoginUseCase } from '../../src/modules/auth/application/login.use-case'
import type { AuthUserRepository } from '../../src/modules/auth/domain/auth-user.repository'
import type { SessionRepository } from '../../src/modules/auth/domain/session.repository'
import type { PasswordService } from '../../src/modules/auth/infrastructure/password.service'

const userId = '11111111-1111-4111-8111-111111111111'

function config(ttlDays = 14, allowPersona = true) {
  return {
    get: vi.fn((key: string) => {
      if (key === 'SESSION_TTL_DAYS') {
        return ttlDays
      }
      if (key === 'ALLOW_DEMO_PERSONA_LOGIN') {
        return allowPersona
      }
      return undefined
    })
  } as never
}

describe('LoginUseCase', () => {
  it('issues a session for valid credentials', async () => {
    const users: AuthUserRepository = {
      findLoginByEmail: vi.fn().mockResolvedValue({
        id: userId,
        email: 'sarah.chen@teamhub.local',
        passwordHash: 'hash',
        displayName: 'Sarah Chen',
        jobTitle: 'Product Team',
        bio: '',
        avatarUrl: null,
        createdAt: new Date(),
        accountKind: 'registered',
        guestExpiresAt: null
      }),
      findById: vi.fn(),
      create: vi.fn(),
      extendGuestExpiry: vi.fn()
    }
    const sessions: SessionRepository = {
      create: vi.fn().mockResolvedValue({}),
      findActiveByTokenHash: vi.fn(),
      revokeById: vi.fn(),
      revokeAllForUser: vi.fn()
    }
    const passwords = {
      verifyLogin: vi.fn().mockResolvedValue(true)
    } as unknown as PasswordService

    const result = await new LoginUseCase(
      users,
      sessions,
      passwords,
      config()
    ).execute({
      email: 'sarah.chen@teamhub.local',
      password: 'TeamHub!dev'
    })

    expect(sessions.create).toHaveBeenCalled()
    expect(result.user.displayName).toBe('Sarah Chen')
    expect(result.user).not.toHaveProperty('passwordHash')
    expect(result.session.rawToken).toEqual(expect.any(String))
  })

  it('rejects invalid credentials', async () => {
    const users: AuthUserRepository = {
      findLoginByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      create: vi.fn(),
      extendGuestExpiry: vi.fn()
    }
    const sessions: SessionRepository = {
      create: vi.fn(),
      findActiveByTokenHash: vi.fn(),
      revokeById: vi.fn(),
      revokeAllForUser: vi.fn()
    }
    const passwords = {
      verifyLogin: vi.fn().mockResolvedValue(false)
    } as unknown as PasswordService

    await expect(
      new LoginUseCase(users, sessions, passwords, config()).execute({
        email: 'nobody@teamhub.local',
        password: 'nope'
      })
    ).rejects.toBeInstanceOf(UnauthorizedError)
    expect(sessions.create).not.toHaveBeenCalled()
  })

  it('rejects demo persona login when disabled', async () => {
    const users: AuthUserRepository = {
      findLoginByEmail: vi.fn().mockResolvedValue({
        id: userId,
        email: 'sarah.chen@teamhub.local',
        passwordHash: 'hash',
        displayName: 'Sarah Chen',
        jobTitle: 'Product Team',
        bio: '',
        avatarUrl: null,
        createdAt: new Date(),
        accountKind: 'demo_persona',
        guestExpiresAt: null
      }),
      findById: vi.fn(),
      create: vi.fn(),
      extendGuestExpiry: vi.fn()
    }
    const sessions: SessionRepository = {
      create: vi.fn(),
      findActiveByTokenHash: vi.fn(),
      revokeById: vi.fn(),
      revokeAllForUser: vi.fn()
    }
    const passwords = {
      verifyLogin: vi.fn().mockResolvedValue(true)
    } as unknown as PasswordService

    await expect(
      new LoginUseCase(users, sessions, passwords, config(14, false)).execute({
        email: 'sarah.chen@teamhub.local',
        password: 'x'
      })
    ).rejects.toBeInstanceOf(UnauthorizedError)
    expect(sessions.create).not.toHaveBeenCalled()
  })
})
