import { describe, expect, it } from 'vitest'
import { realtimeClientOptions, realtimeNamespaceUrl } from './realtime-socket'

describe('realtimeClientOptions', () => {
  it('starts on polling so a bad WebSocket upgrade cannot trap the client', () => {
    expect(realtimeClientOptions.transports).toEqual(['polling', 'websocket'])
    expect(realtimeClientOptions.rememberUpgrade).toBe(false)
    expect(realtimeClientOptions.withCredentials).toBe(true)
    expect(realtimeClientOptions.path).toBe('/socket.io')
  })

  it('joins the /realtime namespace on the page origin when the API URL is empty', () => {
    expect(realtimeNamespaceUrl('')).toBe('/realtime')
    expect(realtimeNamespaceUrl('http://localhost:8080')).toBe(
      'http://localhost:8080/realtime'
    )
  })
})
