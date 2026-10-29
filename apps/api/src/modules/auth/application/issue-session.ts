import type { SessionRepository } from '../domain/session.repository'
import {
  createSessionToken,
  hashSessionToken
} from '../infrastructure/session-token'

export type IssuedSession = {
  rawToken: string
  expiresAt: Date
}

export async function issueSession(
  sessions: SessionRepository,
  userId: string,
  ttlDays: number
): Promise<IssuedSession> {
  const rawToken = createSessionToken()
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

  await sessions.create({
    userId,
    tokenHash: hashSessionToken(rawToken),
    expiresAt
  })

  return { rawToken, expiresAt }
}
