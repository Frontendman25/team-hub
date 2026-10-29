export type SessionRecord = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
}

export type CreateSessionData = {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface SessionRepository {
  create(data: CreateSessionData): Promise<SessionRecord>
  findActiveByTokenHash(tokenHash: string): Promise<SessionRecord | null>
  revokeById(id: string): Promise<void>
  revokeAllForUser(userId: string): Promise<void>
}
