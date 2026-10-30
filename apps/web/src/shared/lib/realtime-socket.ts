import type { ManagerOptions, SocketOptions } from 'socket.io-client'

/**
 * Polling first, then upgrade. Engine.IO `rememberUpgrade` would otherwise
 * lock a failed WebSocket (proxy/gzip/webview) into a reconnect loop and
 * never fall back to polling — which is how the messenger stayed on
 * "Reconnecting…" while `/socket.io` polling still worked.
 */
export const realtimeClientOptions: Partial<ManagerOptions & SocketOptions> = {
  path: '/socket.io',
  withCredentials: true,
  transports: ['polling', 'websocket'],
  rememberUpgrade: false
}

export function realtimeNamespaceUrl(origin: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/realtime`
}
