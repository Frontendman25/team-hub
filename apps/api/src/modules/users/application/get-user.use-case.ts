import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../shared/domain/errors'
import type { UsersRepository } from '../domain/users.repository'
import { USERS_REPOSITORY } from '../users.tokens'

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: UsersRepository
  ) {}

  async execute(id: string, viewerId?: string) {
    const user = await this.users.findById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    if (user.accountKind === 'guest' && viewerId !== id) {
      throw new NotFoundError('User not found')
    }
    if (viewerId === user.id) {
      return user
    }
    return { ...user, email: '' }
  }
}
