import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import type { PublicUser } from '@/shared/types/api'
import { TryDemoButton } from '@/features/auth/ui/try-demo-button'
import { CreateWorkspaceForm } from '@/features/workspaces/ui/create-workspace-form'
import { userQueries } from '@/entities/user/api/queries'
import { getServerQueryClient } from '@/shared/lib/query-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Explore TeamHub or create a private workspace.'
}

export default async function HomePage() {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery(userQueries.me())
  const me = queryClient.getQueryData(userQueries.me().queryKey) as
    | PublicUser
    | null
    | undefined

  try {
    const { data } = await api.workspaces.list()
    const preferred = (await cookies()).get('th.ws')?.value
    const match =
      data.find((workspace) => workspace.slug === preferred) ?? data[0]
    if (match) {
      redirect(`/w/${match.slug}`)
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return <WelcomeUnauthenticated />
    }
    throw error
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-2xl border border-border bg-white p-6">
        <h1 className="text-xl font-semibold">Create your workspace</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Private to the people you invite. Isolated from the public demo.
        </p>
        {me?.accountKind === 'guest' ? (
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
      </div>
      <div className="rounded-2xl border border-dashed border-border bg-white p-6">
        <h2 className="font-semibold">Or explore the public demo</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          A shared Northwind-style company workspace with sample posts, chat,
          files, and a board.
        </p>
        <TryDemoButton label="Open public demo" />
      </div>
    </div>
  )
}

function WelcomeUnauthenticated() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          TeamHub
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          People. Work. Together.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A workspace for feed, chat, files, and a simple board. Try it as a
          visitor, or register and create a private team space.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-6 text-left">
          <h2 className="text-lg font-semibold">Explore Demo</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Instant guest session in a populated public workspace. Your posts
            and messages are visible to other visitors and removed after about
            four hours.
          </p>
          <TryDemoButton className="mt-4" />
        </div>
        <div className="rounded-2xl border border-border bg-white p-6 text-left">
          <h2 className="text-lg font-semibold">Create Your Workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Register, then invite colleagues. Private workspaces never mix with
            the public demo.
          </p>
          <Link
            href="/register"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-white text-sm font-semibold"
          >
            Create account
          </Link>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
