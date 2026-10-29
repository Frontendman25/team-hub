'use client'

import { Avatar } from '@/shared/ui/avatar'
import type { PublicUser } from '@/shared/types/api'

export function ProfileSummary({ user }: { user: PublicUser }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar name={user.displayName} src={user.avatarUrl} size={72} />
        <div>
          <h1 className="text-2xl font-semibold">{user.displayName}</h1>
          <p className="text-muted-foreground">{user.jobTitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6">{user.bio}</p>
        </div>
      </div>
    </section>
  )
}
