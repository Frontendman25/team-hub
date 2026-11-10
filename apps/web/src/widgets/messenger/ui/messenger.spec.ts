import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Messenger } from './messenger'

const state = vi.hoisted(() => ({ kind: 'guest' }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/shared/lib/use-realtime', () => ({ useRealtime: () => ({ connected: true, onlineIds: [] }) }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: string[] }) => {
    if (options.queryKey[0] === 'users') return { data: { id: 'visitor', accountKind: state.kind } }
    if (options.queryKey[0] === 'conversations') return { data: [{ id: 'general', name: 'general', type: 'channel', unreadCount: 0 }] }
    if (options.queryKey[0] === 'workspaces') return { data: [{ userId: 'peer', displayName: 'Demo colleague' }] }
    return { data: [] }
  },
  useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }),
  useMutation: vi.fn(),
  useInfiniteQuery: vi.fn()
}))

describe('demo message navigation', () => {
  it('keeps allowed channels and replaces guest DM contacts with registration', () => {
    state.kind = 'guest'
    const html = renderToStaticMarkup(createElement(Messenger, {
      workspaceId: 'demo', slug: 'demo', role: 'member', demoWorkspace: true
    }))
    expect(html).toContain('href="/w/demo/messages/general"')
    expect(html).toContain('href="/register"')
    expect(html).toContain('You can still write in demo channels')
    expect(html).not.toContain('Demo colleague')
  })
  it('keeps contacts available to registered members', () => {
    state.kind = 'registered'
    const html = renderToStaticMarkup(createElement(Messenger, {
      workspaceId: 'demo', slug: 'demo', role: 'member', demoWorkspace: true
    }))
    expect(html).toContain('Demo colleague')
    expect(html).not.toContain('Private direct messages are not available')
  })
})
