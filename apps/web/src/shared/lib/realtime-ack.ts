import type { Socket } from 'socket.io-client'

export type RealtimeErrorPayload = {
  code: string
  message: string
  clientId?: string
  conversationId?: string
}

export function isRealtimeError(
  value: unknown
): value is RealtimeErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  )
}

export function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeoutMs)
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer)
      resolve(response)
    })
  })
}
