import { getApiBaseUrl } from './env'

type FetchOptions = RequestInit & {
  revalidate?: number | false
  tags?: string[]
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function sessionHeaders(): Promise<HeadersInit> {
  try {
    const { cookies } = await import('next/headers')
    const token = (await cookies()).get('th.sid')?.value
    return token ? { Cookie: `th.sid=${token}` } : {}
  } catch {
    return {}
  }
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { revalidate = 15, tags = ['teamhub'], ...init } = options
  const isMutation = Boolean(init.method && init.method !== 'GET')
  const cookieHeaders = await sessionHeaders()
  const personalized =
    isMutation ||
    path.startsWith('/users/me') ||
    path.startsWith('/notifications') ||
    path.startsWith('/workspaces') ||
    path.startsWith('/invitations') ||
    path.startsWith('/stats') ||
    path.startsWith('/posts') ||
    path.startsWith('/comments') ||
    path.startsWith('/auth/') ||
    path.startsWith('/conversations') ||
    path.startsWith('/messages') ||
    path.startsWith('/files') ||
    path.startsWith('/tasks') ||
    'Cookie' in cookieHeaders

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...cookieHeaders,
      ...init.headers
    },
    cache: personalized || isMutation ? 'no-store' : undefined,
    next:
      personalized || isMutation
        ? undefined
        : {
            revalidate: revalidate === false ? 0 : revalidate,
            tags
          }
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `Request failed: ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}
