import { describe, expect, it, vi } from 'vitest'
import { canStartDirectMessage, openDmOnce } from './dm-policy'

describe('direct message safety', () => {
  it('blocks guests, missing identity and empty workspace IDs', () => {
    expect(canStartDirectMessage('guest', 'demo')).toBe(false)
    expect(canStartDirectMessage(undefined, 'demo')).toBe(false)
    expect(canStartDirectMessage('registered', '')).toBe(false)
    expect(canStartDirectMessage('registered', '  ')).toBe(false)
    expect(canStartDirectMessage('registered', 'workspace')).toBe(true)
    expect(canStartDirectMessage('demo_persona', 'demo')).toBe(true)
  })

  it('does not request a forbidden or incomplete DM', async () => {
    const request = vi.fn()
    const options = { lock: { current: false }, allowed: false, userId: 'peer',
      request, onSuccess: vi.fn(), onError: vi.fn(), onPending: vi.fn() }
    await openDmOnce(options)
    await openDmOnce({ ...options, allowed: true, userId: '' })
    expect(request).not.toHaveBeenCalled()
    expect(options.onPending).not.toHaveBeenCalled()
  })

  it('ignores a second immediate click, then permits the next request', async () => {
    let release!: (value: string) => void
    const request = vi.fn(() => new Promise<string>((resolve) => { release = resolve }))
    const options = { lock: { current: false }, allowed: true, userId: 'peer',
      request, onSuccess: vi.fn(), onError: vi.fn(), onPending: vi.fn() }
    const first = openDmOnce(options)
    await openDmOnce(options)
    expect(request).toHaveBeenCalledTimes(1)
    release('conversation')
    await first
    expect(options.onSuccess).toHaveBeenCalledWith('conversation')
    expect(options.lock.current).toBe(false)
    expect(options.onPending.mock.calls).toEqual([[true], [false]])
    const next = openDmOnce(options)
    expect(request).toHaveBeenCalledTimes(2)
    release('next')
    await next
  })

  it('handles a rejected request without an unhandled rejection and unlocks retry', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('403')).mockResolvedValue('ok')
    const options = { lock: { current: false }, allowed: true, userId: 'peer',
      request, onSuccess: vi.fn(), onError: vi.fn(), onPending: vi.fn() }
    await expect(openDmOnce(options)).resolves.toBeUndefined()
    expect(options.onError).toHaveBeenCalledOnce()
    expect(options.lock.current).toBe(false)
    await openDmOnce(options)
    expect(options.onSuccess).toHaveBeenCalledWith('ok')
  })
})
