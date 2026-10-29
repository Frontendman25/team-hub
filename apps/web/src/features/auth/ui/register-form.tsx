'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { z } from 'zod'
import { api } from '@/shared/api/client'
import { invalidateViewerQueries } from '@/shared/lib/session-cache'
import { ApiError } from '@/shared/lib/api'
import { Button } from '@/shared/ui/button'
import { TryDemoButton } from './try-demo-button'

const schema = z.object({
  displayName: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  jobTitle: z.string().trim().optional()
})

export function RegisterForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      api.auth.register({
        email,
        password,
        displayName,
        jobTitle: jobTitle || undefined
      }),
    onSuccess: async () => {
      await invalidateViewerQueries(queryClient)
      router.push('/')
      router.refresh()
    },
    onError: (cause) => {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not create account'
      )
    }
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = schema.safeParse({
          displayName,
          email,
          password,
          jobTitle
        })
        if (!parsed.success) {
          setError('Name, valid email, and a password of at least 8 characters')
          return
        }
        setError(null)
        mutation.mutate()
      }}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="h-10 w-full rounded-lg border border-border px-3"
          autoComplete="name"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Job title</span>
        <input
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
          className="h-10 w-full rounded-lg border border-border px-3"
          placeholder="Team member"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 w-full rounded-lg border border-border px-3"
          autoComplete="email"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 w-full rounded-lg border border-border px-3"
          autoComplete="new-password"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create account'}
      </Button>
      <TryDemoButton label="Try Demo instead" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
