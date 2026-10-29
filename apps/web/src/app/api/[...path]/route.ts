import { type NextRequest } from 'next/server'

const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
])

function apiOrigin(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3200'
  ).replace(/\/$/, '')
}

function isFileBytes(path: string[]): boolean {
  return path.length === 3 && path[0] === 'files' && path[2] === 'content'
}

function clientIp(request: NextRequest): string {
  if (process.env.WEB_TRUST_PROXY === 'true') {
    const forwarded = request.headers.get('x-forwarded-for')
    const first = forwarded?.split(',')[0]?.trim()
    if (first) {
      return first
    }
    const realIp = request.headers.get('x-real-ip')?.trim()
    if (realIp) {
      return realIp
    }
  }

  return '127.0.0.1'
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params
  const incoming = new URL(request.url)
  const target = `${apiOrigin()}/${path.join('/')}${incoming.search}`
  const headers = new Headers()

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (hopByHop.has(lower)) {
      return
    }
    if (
      lower === 'x-forwarded-for' ||
      lower === 'x-teamhub-proxy-secret' ||
      lower === 'x-real-ip'
    ) {
      return
    }
    headers.set(key, value)
  })

  headers.set('x-forwarded-for', clientIp(request))
  const proxySecret = process.env.AUTH_PROXY_SECRET
  if (proxySecret) {
    headers.set('x-teamhub-proxy-secret', proxySecret)
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store'
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  try {
    const upstream = await fetch(target, init)
    const outbound = new Headers()

    const fileBytes = isFileBytes(path)
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (lower === 'content-length' && fileBytes) {
        outbound.set(key, value)
        return
      }
      if (hopByHop.has(lower)) {
        return
      }
      if (lower === 'set-cookie') {
        return
      }
      outbound.set(key, value)
    })

    const setCookies =
      typeof upstream.headers.getSetCookie === 'function'
        ? upstream.headers.getSetCookie()
        : []
    for (const cookie of setCookies) {
      outbound.append('set-cookie', cookie)
    }

    if (!fileBytes) {
      outbound.set('cache-control', 'no-store')
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: outbound
    })
  } catch {
    return Response.json(
      {
        statusCode: 502,
        code: 'BAD_GATEWAY',
        message: 'API is unavailable'
      },
      { status: 502 }
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
