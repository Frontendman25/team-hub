import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

export type ClientIpOptions = {
  trustedProxyIps: string[]
  proxySecret?: string
}

export function parseTrustedProxyIps(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function headerValue(
  headers: IncomingMessage['headers'],
  name: string
): string | undefined {
  const value = headers[name]
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

function secretsEqual(provided: string | undefined, expected: string): boolean {
  if (!provided) {
    return false
  }
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

function firstForwardedIp(header: string | undefined): string | undefined {
  const first = header?.split(',')[0]?.trim()
  return first || undefined
}

export function resolveClientIp(
  req: Pick<IncomingMessage, 'headers' | 'socket'>,
  options: ClientIpOptions
): string {
  const peer = req.socket.remoteAddress ?? 'unknown'
  const forwarded = firstForwardedIp(
    headerValue(req.headers, 'x-forwarded-for')
  )
  const secretOk = Boolean(
    options.proxySecret &&
    secretsEqual(
      headerValue(req.headers, 'x-teamhub-proxy-secret'),
      options.proxySecret
    )
  )
  const peerTrusted =
    LOOPBACK.has(peer) || options.trustedProxyIps.includes(peer)

  if ((secretOk || peerTrusted) && forwarded) {
    return forwarded
  }

  return peer
}
