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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const me = useQuery(userQueries.me())
  const { current } = useCurrentWorkspace()
  const setComposerOpen = useUiStore((state) => state.setComposerOpen)
  const setSearchOpen = useUiStore((state) => state.setSearchOpen)
  const homeHref = current ? `/w/${current.slug}` : '/'
  const settingsHref = current ? `/w/${current.slug}/settings` : '/invitations'
  const messagesHref = current ? `/w/${current.slug}/messages` : '/login'
  const filesHref = current ? `/w/${current.slug}/files` : '/login'
  const membersHref = current ? `/w/${current.slug}/members` : '/login'
  const boardHref = current ? `/w/${current.slug}/board` : '/login'

  return (
    <div className="min-h-screen bg-canvas">
      <CommandPalette />
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4">
          <Link href={homeHref} className="flex items-center gap-2 font-semibold">
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
          <div className="ml-auto flex items-center gap-3">
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
            {[
              { href: homeHref, label: 'Home', icon: Home },
              ...(current
                ? [
                    { href: messagesHref, label: 'Messages', icon: MessageSquare },
                    { href: boardHref, label: 'Board', icon: Kanban },
                    { href: filesHref, label: 'Files', icon: Folder },
                    { href: membersHref, label: 'Members', icon: Users }
                  ]
                : []),
              { href: '/profile', label: 'My Profile', icon: UserRound },
              { href: '/invitations', label: 'Invites', icon: Mail },
              ...(current
                ? [{ href: settingsHref, label: 'Settings', icon: Settings }]
                : [])
            ].map((item) => {
              const active =
                item.label === 'Home'
                  ? pathname === '/' ||
                    pathname === `/w/${current?.slug ?? ''}`
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
                    active
                      ? 'bg-accent/70 text-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
            {me.data ? (
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
            ) : (
              <>
                <TryDemoButton className="mt-2" label="Try Demo" />
                <Link
                  href="/login"
                  className="mt-2 block rounded-xl px-3 py-2 text-center text-sm font-semibold text-muted-foreground"
                >
                  Sign in
                </Link>
              </>
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pb-16 md:pb-0">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white md:hidden">
        <div className="grid grid-cols-6">
          {[
            { href: homeHref, label: 'Home', icon: Home },
            { href: messagesHref, label: 'Chat', icon: MessageSquare },
            { href: boardHref, label: 'Board', icon: Kanban },
            { href: filesHref, label: 'Files', icon: Folder },
            { href: '/profile', label: 'Profile', icon: UserRound },
            { href: '/invitations', label: 'Invites', icon: Mail }
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center py-2 text-xs"
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
