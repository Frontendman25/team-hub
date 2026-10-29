import type { AccountKind } from '../../demo/demo.constants'

export type PublicUser = {
  id: string
  email: string
  displayName: string
  jobTitle: string
  bio: string
  avatarUrl: string | null
  createdAt: Date
  accountKind: AccountKind
  guestExpiresAt: Date | null
}

export interface UsersRepository {
  findById(id: string): Promise<PublicUser | null>
  list(limit: number): Promise<PublicUser[]>
}
