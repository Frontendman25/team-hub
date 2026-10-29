import type { CookieOptions } from 'express'

export const SESSION_COOKIE = 'th.sid'

export function sessionCookieBase(options: {
  secure: boolean
  domain?: string
  maxAgeMs?: number
}): CookieOptions {
  const cookie: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: options.secure,
    path: '/'
  }
  if (options.domain) {
    cookie.domain = options.domain
  }
  if (options.maxAgeMs !== undefined) {
    cookie.maxAge = options.maxAgeMs
  }
  return cookie
}

export function readCookie(
  header: string | undefined,
  name: string
): string | undefined {
  if (!header) {
    return undefined
  }

  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (rawKey === name) {
      return rest.join('=')
    }
  }

  return undefined
}
