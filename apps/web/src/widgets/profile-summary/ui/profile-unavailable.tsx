'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/button'

export function ProfileUnavailable() {
  const router = useRouter()
  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h1 className="text-xl font-semibold">Profile unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This profile does not exist or is not available to you.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Go back</Button>
        <Link href="/" className="text-sm font-medium underline">Back to Home</Link>
      </div>
    </section>
  )
}