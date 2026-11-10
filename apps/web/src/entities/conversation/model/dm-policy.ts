import type { PublicUser } from '@/shared/types/api'

export function canStartDirectMessage(
  accountKind: PublicUser['accountKind'],
  workspaceId: string
): boolean {
  return Boolean(workspaceId.trim()) && Boolean(accountKind) && accountKind !== 'guest'
}

// A synchronous lock also catches clicks before React has rendered pending state.
export async function openDmOnce<T>(input: {
  lock: { current: boolean }
  allowed: boolean
  userId: string
  request: () => Promise<T>
  onSuccess: (result: T) => void | Promise<void>
  onError: () => void
  onPending: (pending: boolean) => void
}): Promise<void> {
  if (!input.allowed || !input.userId.trim() || input.lock.current) return
  input.lock.current = true
  input.onPending(true)
  try {
    const result = await input.request()
    await input.onSuccess(result)
  } catch {
    input.onError()
  } finally {
    input.lock.current = false
    input.onPending(false)
  }
}