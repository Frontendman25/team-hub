import { describe, expect, it, vi } from 'vitest'
import { RedisLifecycle } from '../../src/infrastructure/redis/redis-lifecycle'
import { InvitationQueue } from '../../src/modules/workspaces/infrastructure/invitation.queue'

describe('RedisLifecycle', () => {
  it('re-runs restore handlers when another client reconnects during recovery', async () => {
    const lifecycle = new RedisLifecycle()
    const handler = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    lifecycle.onRestored(handler)
    await Promise.all([
      lifecycle.notifyRestored('a'),
      lifecycle.notifyRestored('b')
    ])
    expect(handler).toHaveBeenCalledTimes(2)
  })
})

describe('InvitationQueue recovery', () => {
  it('re-queues pending invitations that still need an in-app notification', async () => {
    const added: string[] = []
    const queue = {
      waitUntilReady: async () => undefined,
      close: async () => undefined,
      add: async (_name: string, data: { invitationId: string }) => {
        added.push(data.invitationId)
      }
    }
    const workspaces = {
      listPendingInvitationsMissingNotification: async () => ['inv-1', 'inv-2']
    }
    const lifecycle = new RedisLifecycle()
    const invitations = new InvitationQueue(
      queue as never,
      workspaces as never,
      lifecycle
    )
    await invitations.onModuleInit()
    const count = await invitations.recoverFromPostgres()
    expect(count).toBe(2)
    expect(added).toEqual(['inv-1', 'inv-2'])
    await invitations.onModuleDestroy()
  })
})
