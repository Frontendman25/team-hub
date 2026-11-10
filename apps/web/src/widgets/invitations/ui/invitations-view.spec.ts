import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvitationsView } from './invitations-view'

const state = vi.hoisted(() => ({ kind: 'guest' as string | undefined, enabled: undefined as boolean | undefined }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: string[]; enabled?: boolean }) => {
    if (options.queryKey[0] === 'users') return { data: state.kind ? { accountKind: state.kind } : undefined }
    state.enabled = options.enabled
    return { isPending: true }
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn() })
}))
vi.mock('@/features/workspaces/ui/create-workspace-form', () => ({ CreateWorkspaceForm: () => null }))

describe('invitations in demo', () => {
  beforeEach(() => { state.kind = 'guest'; state.enabled = undefined })
  it('does not enable the invitations query for guests and offers registration', () => {
    const html = renderToStaticMarkup(createElement(InvitationsView))
    expect(state.enabled).toBe(false)
    expect(html).toContain('Invitations are available to registered users')
    expect(html).toContain('href="/register"')
  })
  it('waits for identity instead of requesting invitations while loading', () => {
    state.kind = undefined
    renderToStaticMarkup(createElement(InvitationsView))
    expect(state.enabled).toBe(false)
  })
  it('enables the invitations query for registered users', () => {
    state.kind = 'registered'
    renderToStaticMarkup(createElement(InvitationsView))
    expect(state.enabled).toBe(true)
  })
})
