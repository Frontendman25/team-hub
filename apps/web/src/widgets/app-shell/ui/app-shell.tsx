'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Folder,
  Home,
  Kanban,
  Mail,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  Users
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { userQueries } from '@/entities/user/api/queries'
import { LogoutButton } from '@/features/auth/ui/logout-button'
import { TryDemoButton } from '@/features/auth/ui/try-demo-button'
import { cn } from '@/shared/lib/cn'
import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'
import { CommandPalette } from '@/widgets/command-palette/ui/command-palette'
import { NotificationBell } from '@/widgets/notification-bell/ui/notification-bell'
import { WorkspaceSwitcher } from '@/widgets/workspace-switcher/ui/workspace-switcher'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { useUiStore } from '@/shared/model/ui-store'
import { WorkspaceNavItem } from './workspace-nav-item'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const me = useQuery(userQueries.me())
  const { current, workspaces, isPending, isError } = useCurrentWorkspace()
  const setComposerOpen = useUiStore((state) => state.setComposerOpen)
  const setSearchOpen = useUiStore((state) => state.setSearchOpen)
  const homeHref = current ? `/w/${current.slug}` : '/'
  const settingsHref = current ? `/w/${current.slug}/settings` : '/invitations'
  const messagesHref = current ? `/w/${current.slug}/messages` : '/login'
  const filesHref = current ? `/w/${current.slug}/files` : '/login'
  const membersHref = current ? `/w/${current.slug}/members` : '/login'
  const boardHref = current ? `/w/${current.slug}/board` : '/login'

  const showWorkspaceSections = Boolean(
    current || (me.data && !isPending && !isError && workspaces.length === 0)
  )
  const navigation = [
    { href: homeHref, label: 'Home', icon: Home, needsWorkspace: false },
    ...(showWorkspaceSections
      ? [
          {
            href: messagesHref,
            label: 'Messages',
            icon: MessageSquare,
            needsWorkspace: true
          },
          {
            href: boardHref,
            label: 'Board',
            icon: Kanban,
            needsWorkspace: true
          },
          {
            href: filesHref,
            label: 'Files',
            icon: Folder,
            needsWorkspace: true
          },
          {
            href: membersHref,
            label: 'Members',
            icon: Users,
            needsWorkspace: true
          }
        ]
      : []),
    {
      href: '/profile',
      label: 'My Profile',
      icon: UserRound,
      needsWorkspace: false
    },
    {
      href: '/invitations',
      label: 'Invites',
      icon: Mail,
      needsWorkspace: false
    },
    ...(showWorkspaceSections
      ? [
          {
            href: settingsHref,
            label: 'Settings',
            icon: Settings,
            needsWorkspace: true
          }
        ]
      : [])
  ]

  return (
    <div className="min-h-screen bg-canvas">
      <CommandPalette />
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center gap-2 px-4 py-2 sm:flex-nowrap sm:gap-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 font-semibold"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm text-accent-foreground">
              TH
            </span>
            <span>
              TeamHub
              <span className="hidden text-xs font-normal text-muted-foreground sm:block">
                People. Work. Together.
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="relative mx-auto hidden h-10 w-full max-w-md rounded-full border border-border bg-muted/60 px-3 text-left text-sm text-muted-foreground md:flex md:items-center md:gap-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
            <span className="flex-1">Search people, channels, posts…</span>
            <kbd className="rounded-md border border-border bg-white px-1.5 text-[10px]">
              Ctrl K
            </kbd>
          </button>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {me.data ? (
              <>
                <WorkspaceSwitcher />
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full hover:bg-muted md:hidden"
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="size-4" />
                </button>
                <NotificationBell />
                <Link href="/profile" className="flex items-center gap-2">
                  <Avatar
                    name={me.data.displayName}
                    src={me.data.avatarUrl}
                    size={32}
                  />
                  <span className="hidden text-sm font-medium lg:block">
                    {me.data.displayName}
                  </span>
                </Link>
                <LogoutButton />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => router.push('/login')}
                >
                  Sign in
                </Button>
                <div className="hidden sm:block">
                  <TryDemoButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {me.data?.accountKind === 'guest' ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <p>
              You are in the <strong>public demo</strong>. Other visitors can
              see what you post. Guest content is removed after about four
              hours.{' '}
              <Link href="/register" className="font-medium underline">
                Create a private workspace
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1280px] gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-border bg-white p-2 shadow-sm">
            {navigation.map((item) => (
              <WorkspaceNavItem
                key={item.label}
                label={item.label}
                href={item.href}
                locked={item.needsWorkspace && !current}
                active={
                  item.label === 'Home'
                    ? pathname === '/' || pathname === homeHref
                    : pathname.startsWith(item.href)
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </WorkspaceNavItem>
            ))}
            {me.data && current ? (
              <button
                type="button"
                className="mt-2 w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold"
                onClick={() => {
                  router.push(homeHref)
                  setComposerOpen(true)
                }}
              >
                New post
              </button>
            ) : !me.data ? (
              <>
                <TryDemoButton className="mt-2" label="Try Demo" />
                <Link
                  href="/login"
                  className="mt-2 block rounded-xl px-3 py-2 text-center text-sm font-semibold text-muted-foreground"
                >
                  Sign in
                </Link>
              </>
            ) : null}
          </nav>
        </aside>

        <main
          className={cn(
            'min-w-0 flex-1 md:pb-0',
            showWorkspaceSections
              ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'
          )}
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div
          className={cn(
            'grid',
            showWorkspaceSections ? 'grid-cols-4' : 'grid-cols-3'
          )}
        >
          {navigation.map((item) => (
            <WorkspaceNavItem
              key={item.label}
              label={item.label}
              href={item.href}
              mobile
              locked={item.needsWorkspace && !current}
              active={
                item.label === 'Home'
                  ? pathname === '/' || pathname === homeHref
                  : pathname.startsWith(item.href)
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </WorkspaceNavItem>
          ))}
        </div>
      </nav>
    </div>
  )
}
