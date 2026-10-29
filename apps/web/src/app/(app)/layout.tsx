import { Suspense } from 'react'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { userQueries } from '@/entities/user/api/queries'
import { workspaceQueries } from '@/entities/workspace/api/queries'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { AppShell } from '@/widgets/app-shell/ui/app-shell'

export const dynamic = 'force-dynamic'

export default async function AppGroupLayout({
  children
}: {
  children: React.ReactNode
}) {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery(userQueries.me())
  const me = queryClient.getQueryData(userQueries.me().queryKey)
  if (me) {
    await queryClient.prefetchQuery(workspaceQueries.list())
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <AppShell>{children}</AppShell>
      </Suspense>
    </HydrationBoundary>
  )
}
