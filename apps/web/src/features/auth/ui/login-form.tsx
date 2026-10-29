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
  email: z.string().email(),
  password: z.string().min(1)
})

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.auth.login({ email, password }),
    onSuccess: async () => {
      await invalidateViewerQueries(queryClient)
      router.push('/')
      router.refresh()
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Could not sign in')
    }
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = schema.safeParse({ email, password })
        if (!parsed.success) {
          setError('Enter a valid email and password')
          return
        }
        setError(null)
        mutation.mutate()
      }}
    >
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
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
      <TryDemoButton label="Try Demo instead" />
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="font-medium text-foreground underline">
          Create one
        </Link>
      </p>
    </form>
  )
}
