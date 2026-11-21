'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { userQueries } from '@/entities/user/api/queries'
import { useCurrentWorkspace } from '@/entities/workspace/model/use-current-workspace'
import { CreateWorkspaceForm } from '@/features/workspaces/ui/create-workspace-form'
import { TryDemoButton } from '@/features/auth/ui/try-demo-button'
import { Button } from '@/shared/ui/button'

export function WorkspaceHome({
  preferredSlug = null
}: {
  preferredSlug?: string | null
}) {
  const { current, isPending, isError, retry } =
    useCurrentWorkspace(preferredSlug)
  const me = useQuery(userQueries.me())
  const router = useRouter()
  useEffect(() => {
    if (!isPending && !isError && current) router.replace(`/w/${current.slug}`)
  }, [current, isPending, isError, router])

  if (isPending) return <p role="status">Loading your workspaces…</p>
  if (isError)
    return (
      <section
        role="alert"
        className="max-w-xl rounded-2xl border border-border bg-white p-5 sm:p-6"
      >
        <h1 className="text-xl font-semibold">
          Could not load your workspaces
        </h1>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          Please try again. Your workspace list could not be retrieved.
        </p>
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>
      </section>
    )
  if (current) return <p role="status">Opening {current.name}…</p>

  return (
    <div className="w-full max-w-xl space-y-4">
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h1 className="text-xl font-semibold">Create your first workspace</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Private to the people you invite. Isolated from the public demo.
        </p>
        {me.data?.accountKind === 'guest' ? (
          <p className="text-sm text-muted-foreground">
            Demo visitors cannot create workspaces.{' '}
            <Link href="/register" className="font-medium underline">
              Create an account
            </Link>{' '}
            first.
          </p>
        ) : (
          <CreateWorkspaceForm />
        )}
      </section>
      <section className="rounded-2xl border border-dashed border-border p-5 sm:p-6">
        <h2 className="font-semibold">Explore the public demo</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          A shared workspace with sample posts, chat, files, and a board.
        </p>
        <TryDemoButton label="Open public demo" variant="outline" />
      </section>
    </div>
  )
}
