import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { userQueries } from '@/entities/user/api/queries'
import { getServerQueryClient } from '@/shared/lib/query-client'
import type { PublicUser } from '@/shared/types/api'
import { ProfileView } from '@/widgets/profile-summary/ui/profile-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false }
}

export default async function ProfilePage() {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery(userQueries.me())
  const me = queryClient.getQueryData<PublicUser | null>(
    userQueries.me().queryKey
  )

  if (!me) {
    redirect('/login')
  }

  await queryClient.prefetchQuery(userQueries.detail(me.id))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileView userId={me.id} />
    </HydrationBoundary>
  )
}
