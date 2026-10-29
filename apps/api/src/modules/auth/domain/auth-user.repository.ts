import type { AccountKind } from '../../demo/demo.constants'

export type RegisterUserData = {
  email: string
  passwordHash: string
  displayName: string
  jobTitle: string
  bio: string
  accountKind?: AccountKind
  guestExpiresAt?: Date | null
}

export type PublicAuthUser = {
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

export type LoginUser = PublicAuthUser & {
  passwordHash: string
}

export interface AuthUserRepository {
  findLoginByEmail(email: string): Promise<LoginUser | null>
  findById(id: string): Promise<PublicAuthUser | null>
  create(data: RegisterUserData): Promise<PublicAuthUser>
  extendGuestExpiry(userId: string, guestExpiresAt: Date): Promise<void>
}
