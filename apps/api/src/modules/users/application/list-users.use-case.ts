import { Inject, Injectable } from '@nestjs/common'
import type { UsersRepository } from '../domain/users.repository'
import { USERS_REPOSITORY } from '../users.tokens'

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: UsersRepository
  ) {}

  async execute(limit = 12) {
    const users = await this.users.list(limit)
    return users.map((user) => ({ ...user, email: '' }))
  }
}
