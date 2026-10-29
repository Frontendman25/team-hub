import { describe, expect, it, vi } from 'vitest'
import { emitWithAck, isRealtimeError } from './realtime-ack'

describe('isRealtimeError', () => {
  it('detects gateway error payloads', () => {
    expect(
      isRealtimeError({
        code: 'RATE_LIMITED',
        message: 'Slow down',
        clientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      })
    ).toBe(true)
  })

  it('does not treat a serialized message as an error', () => {
    expect(
      isRealtimeError({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Hello',
        clientId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      })
    ).toBe(false)
  })
})

describe('emitWithAck', () => {
  it('resolves with the acknowledgement payload', async () => {
    const socket = {
      emit: vi.fn((_event: string, _payload: unknown, ack: (value: unknown) => void) => {
        ack({ id: 'm1' })
      })
    }
    await expect(
      emitWithAck(socket as never, 'message.send', { content: 'Hi' })
    ).resolves.toEqual({ id: 'm1' })
  })
})
