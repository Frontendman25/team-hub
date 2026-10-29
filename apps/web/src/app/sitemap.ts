import type { MetadataRoute } from 'next'
import { api } from '@/shared/api/client'
import { getSiteUrl } from '@/shared/lib/env'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl()
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: site,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1
    },
    {
      url: `${site}/profile`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6
    }
  ]

  try {
    const users = await api.users.list()

    return [
      ...staticRoutes,
      ...users.map((user) => ({
        url: `${site}/users/${user.id}`,
        lastModified: new Date(user.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.5
      }))
    ]
  } catch {
    return staticRoutes
  }
}
