import { describe, expect, it } from 'vitest'
import { resolveClientIp } from '../../src/infrastructure/http/client-ip'

function req(overrides: { peer: string; forwarded?: string; secret?: string }) {
  return {
    socket: { remoteAddress: overrides.peer },
    headers: {
      'x-forwarded-for': overrides.forwarded,
      'x-teamhub-proxy-secret': overrides.secret
    }
  }
}

describe('resolveClientIp', () => {
  it('ignores spoofed X-Forwarded-For from an untrusted peer', () => {
    const ip = resolveClientIp(
      req({ peer: '203.0.113.10', forwarded: '8.8.8.8' }),
      { trustedProxyIps: ['127.0.0.1'] }
    )
    expect(ip).toBe('203.0.113.10')
  })

  it('uses X-Forwarded-For only from loopback', () => {
    const ip = resolveClientIp(
      req({ peer: '127.0.0.1', forwarded: '203.0.113.50' }),
      { trustedProxyIps: ['127.0.0.1'] }
    )
    expect(ip).toBe('203.0.113.50')
  })

  it('uses X-Forwarded-For when the proxy secret matches', () => {
    const ip = resolveClientIp(
      req({
        peer: '198.51.100.2',
        forwarded: '203.0.113.50',
        secret: 'a-very-long-secret'
      }),
      {
        trustedProxyIps: ['127.0.0.1'],
        proxySecret: 'a-very-long-secret'
      }
    )
    expect(ip).toBe('203.0.113.50')
  })

  it('ignores X-Forwarded-For when the proxy secret is wrong', () => {
    const ip = resolveClientIp(
      req({
        peer: '198.51.100.2',
        forwarded: '8.8.8.8',
        secret: 'nope'
      }),
      {
        trustedProxyIps: ['127.0.0.1'],
        proxySecret: 'a-very-long-secret'
      }
    )
    expect(ip).toBe('198.51.100.2')
  })
})
