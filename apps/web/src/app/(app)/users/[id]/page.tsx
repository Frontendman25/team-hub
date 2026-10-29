import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { userQueries } from '@/entities/user/api/queries'
import { api } from '@/shared/api/client'
import { ApiError } from '@/shared/lib/api'
import { getServerQueryClient } from '@/shared/lib/query-client'
import { ProfileView } from '@/widgets/profile-summary/ui/profile-view'

type Params = { id: string }

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const user = await api.users.get(id)
    return {
      title: user.displayName,
      description: user.bio || `${user.displayName} · ${user.jobTitle}`,
      alternates: { canonical: `/users/${id}` }
    }
  } catch {
    return { title: 'Profile not found' }
  }
}

export default async function UserPage({
  params
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const queryClient = getServerQueryClient()

  try {
    await Promise.all([
      queryClient.prefetchQuery(userQueries.detail(id)),
      queryClient.prefetchQuery(userQueries.me())
    ])
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileView userId={id} />
    </HydrationBoundary>
  )
}
