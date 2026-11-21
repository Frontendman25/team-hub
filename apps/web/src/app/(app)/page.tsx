import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { PublicUser } from '@/shared/types/api'
import { TryDemoButton } from '@/features/auth/ui/try-demo-button'
import { userQueries } from '@/entities/user/api/queries'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { WorkspaceHome } from '@/widgets/workspace-home/ui/workspace-home'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Explore TeamHub or create a private workspace.'
}

export default async function HomePage() {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery(userQueries.me())
  const me = queryClient.getQueryData(userQueries.me().queryKey) as
    PublicUser | null | undefined

  const preferredSlug = (await cookies()).get('th.ws')?.value ?? null
  return me ? (
    <WorkspaceHome preferredSlug={preferredSlug} />
  ) : (
    <WelcomeUnauthenticated />
  )
}

function WelcomeUnauthenticated() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          TeamHub
        </p>
        <h1 className="mt-2 text-2xl font-semibold">People. Work. Together.</h1>
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
