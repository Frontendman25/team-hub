import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Workspace } from '@/shared/types/api'
import { selectWorkspace } from '@/entities/workspace/model/select-workspace'
import { WorkspaceHome } from './workspace-home'
import { AppShell } from '@/widgets/app-shell/ui/app-shell'

const state = vi.hoisted(() => ({
  pending: false,
  error: false,
  workspaces: [] as Workspace[],
  replace: vi.fn(),
  refetch: vi.fn(),
  effects: [] as (() => void)[],
  retryAction: undefined as undefined | (() => void)
}))
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useEffect: (effect: () => void) => {
    state.effects.push(effect)
  }
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: state.replace, push: vi.fn() })
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === 'users'
      ? {
          data: {
            id: 'user',
            displayName: 'Test User',
            accountKind: 'registered'
          },
          isPending: false,
          isError: false
        }
      : {
          data: state.pending ? undefined : state.workspaces,
          isPending: state.pending,
          isError: state.error,
          refetch: state.refetch
        }
}))
vi.mock('@/features/workspaces/ui/create-workspace-form', () => ({
  CreateWorkspaceForm: () =>
    createElement(
      'form',
      null,
      'Workspace name',
      createElement('button', null, 'Create workspace')
    )
}))
vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick
  }: {
    children: string
    onClick: () => void
  }) => {
    if (children === 'Retry') state.retryAction = onClick
    return createElement('button', null, children)
  }
}))
vi.mock('@/features/auth/ui/try-demo-button', () => ({
  TryDemoButton: ({ label, variant }: { label: string; variant: string }) =>
    createElement('button', { 'data-variant': variant }, label)
}))
vi.mock('@/widgets/command-palette/ui/command-palette', () => ({
  CommandPalette: () => null
}))
vi.mock('@/widgets/notification-bell/ui/notification-bell', () => ({
  NotificationBell: () => null
}))
vi.mock('@/widgets/workspace-switcher/ui/workspace-switcher', () => ({
  WorkspaceSwitcher: () => null
}))
vi.mock('@/features/auth/ui/logout-button', () => ({
  LogoutButton: () => createElement('button', null, 'Sign out')
}))

const workspace = (slug: string): Workspace => ({
  id: slug,
  slug,
  name: slug,
  description: '',
  createdById: 'user',
  createdAt: '',
  updatedAt: '',
  role: 'member',
  kind: 'private'
})

beforeEach(() => {
  state.pending = false
  state.error = false
  state.workspaces = []
  state.effects = []
  state.retryAction = undefined
  vi.clearAllMocks()
})

describe('workspace home states', () => {
  it('does not show first-workspace creation during loading', () => {
    state.pending = true
    const html = renderToStaticMarkup(createElement(WorkspaceHome))
    expect(html).toContain('Loading your workspaces')
    expect(html).not.toContain('Create workspace')
    expect(html).not.toContain('Open public demo')
  })
  it('shows an error and Retry rather than creation for a failed request', () => {
    state.error = true
    const html = renderToStaticMarkup(createElement(WorkspaceHome))
    expect(html).toContain('Could not load your workspaces')
    expect(html).toContain('Retry')
    expect(html).not.toContain('Create workspace')
    // Exercise the actual retry callback exposed by the hook.
    state.retryAction!()
    expect(state.refetch).toHaveBeenCalledOnce()
  })
  it('shows left-aligned creation only after a successful empty response', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceHome))
    expect(html).toContain('Create your first workspace')
    expect(html).toContain('The remaining menu sections will become available.')
    expect(html).toContain('Create workspace')
    expect(html).toContain('data-variant="outline"')
    expect(html).not.toContain('mx-auto')
    expect(html).not.toContain('Northwind')
  })
  it('opens an existing accessible workspace without showing creation', () => {
    state.workspaces = [workspace('team')]
    const html = renderToStaticMarkup(createElement(WorkspaceHome))
    state.effects.forEach((effect) => effect())
    expect(state.replace).toHaveBeenCalledWith('/w/team')
    expect(html).not.toContain('Create workspace')
  })
  it('preserves the server cookie preference on the initial render', () => {
    state.workspaces = [workspace('first'), workspace('remembered')]
    renderToStaticMarkup(
      createElement(WorkspaceHome, { preferredSlug: 'remembered' })
    )
    state.effects.forEach((effect) => effect())
    expect(state.replace).toHaveBeenCalledWith('/w/remembered')
    expect(state.replace).not.toHaveBeenCalledWith('/w/first')
  })
})

describe('workspace selection and navigation', () => {
  it('prefers an accessible path, then remembered workspace, then first membership', () => {
    const first = workspace('first'),
      second = workspace('second')
    expect(selectWorkspace([first, second], 'first', 'second')).toBe(first)
    expect(selectWorkspace([first, second], 'removed', 'second')).toBe(second)
    expect(selectWorkspace([first, second], null, 'removed')).toBe(first)
    expect(selectWorkspace([], null, 'teamhub')).toBeNull()
  })
  it('shows every section without workspace links or New post after a confirmed empty response', () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, 'Content'))
    expect(html).toContain('Sign out')
    expect(html).toContain('My Profile')
    expect(html).not.toContain('New post')
    for (const label of ['Messages', 'Board', 'Files', 'Members', 'Settings']) {
      expect(html).toContain(`Create or join a workspace to use ${label}.`)
    }
    expect(html.match(/aria-disabled="true"/g) ?? []).toHaveLength(10)
    expect(html).not.toContain('href="/login"')
    expect(html).toContain('grid-cols-4')
    expect(html).toContain('safe-area-inset-bottom')
  })
  it.each(['pending', 'error'] as const)(
    'does not claim workspace absence while %s',
    (status) => {
      state[status] = true
      const html = renderToStaticMarkup(
        createElement(AppShell, null, 'Content')
      )
      expect(html).not.toContain('Create or join a workspace')
      expect(html).not.toContain('New post')
    }
  )
  it('shows normal navigation for a workspace member', () => {
    state.workspaces = [workspace('team')]
    const html = renderToStaticMarkup(createElement(AppShell, null, 'Content'))
    for (const path of ['messages', 'board', 'files', 'members', 'settings'])
      expect(html).toContain(`href="/w/team/${path}"`)
    expect(html).toContain('New post')
    expect(html).not.toContain('aria-disabled="true"')
    expect(html).not.toContain('Create or join a workspace')
  })
})
