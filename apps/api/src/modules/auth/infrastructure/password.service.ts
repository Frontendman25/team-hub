import { Injectable } from '@nestjs/common'
import { hash, verify, type Options } from '@node-rs/argon2'

const ARGON2_OPTIONS: Options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
}

@Injectable()
export class PasswordService {
  private dummyHashPromise: Promise<string> | undefined

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS)
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password)
  }

  /**
   * Always run Argon2, including when the email is unknown, so timing
   * does not reveal whether the account exists.
   */
  async verifyLogin(
    passwordHash: string | undefined,
    password: string
  ): Promise<boolean> {
    const candidate = passwordHash ?? (await this.dummyHash())
    try {
      return await verify(candidate, password)
    } catch {
      return false
    }
  }

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= hash('not-a-real-user', ARGON2_OPTIONS)
    return this.dummyHashPromise
  }
}
