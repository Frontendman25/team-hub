'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/shared/api/client'
import { invalidateViewerQueries } from '@/shared/lib/session-cache'
import {
  registerSchema,
  registerFieldErrors,
  registerServerError,
  type RegisterFieldErrors,
  type RegisterValues
} from '../model/register-validation'
import { Button } from '@/shared/ui/button'
import { TryDemoButton } from './try-demo-button'

export function RegisterForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})

  function clearFieldError(field: keyof RegisterValues) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
  }

  const mutation = useMutation({
    mutationFn: (values: RegisterValues) => api.auth.register(values),
    onSuccess: async () => {
      await invalidateViewerQueries(queryClient)
      router.push('/')
      router.refresh()
    },
    onError: (cause) => {
      const failure = registerServerError(cause)
      setFieldErrors(failure.fields)
      setError(failure.message)
    }
  })

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (mutation.isPending) return
        setError(null)
        const parsed = registerSchema.safeParse({
          displayName,
          email,
          password,
          jobTitle
        })
        if (!parsed.success) {
          setFieldErrors(registerFieldErrors(parsed.error.issues))
          return
        }
        setFieldErrors({})
        mutation.mutate(parsed.data)
      }}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value)
            clearFieldError('displayName')
          }}
          aria-invalid={Boolean(fieldErrors.displayName)}
          aria-describedby={
            fieldErrors.displayName ? 'register-name-error' : undefined
          }
          className="h-10 w-full rounded-lg border border-border px-3"
          autoComplete="name"
        />
        {fieldErrors.displayName ? (
          <span
            id="register-name-error"
            role="alert"
            className="block text-red-600"
          >
            {fieldErrors.displayName}
          </span>
        ) : null}
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Job title</span>
        <input
          value={jobTitle}
          onChange={(event) => {
            setJobTitle(event.target.value)
            clearFieldError('jobTitle')
          }}
          aria-invalid={Boolean(fieldErrors.jobTitle)}
          aria-describedby={
            fieldErrors.jobTitle ? 'register-job-title-error' : undefined
          }
          className="h-10 w-full rounded-lg border border-border px-3"
          placeholder="Team member"
        />
        {fieldErrors.jobTitle ? (
          <span
            id="register-job-title-error"
            role="alert"
            className="block text-red-600"
          >
            {fieldErrors.jobTitle}
          </span>
        ) : null}
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            clearFieldError('email')
          }}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={
            fieldErrors.email ? 'register-email-error' : undefined
          }
          className="h-10 w-full rounded-lg border border-border px-3"
          autoComplete="email"
        />
        {fieldErrors.email ? (
          <span
            id="register-email-error"
            role="alert"
            className="block text-red-600"
          >
            {fieldErrors.email}
          </span>
        ) : null}
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearFieldError('password')
          }}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? 'register-password-error' : undefined
          }
          className="h-10 w-full rounded-lg border border-border px-3"
          autoComplete="new-password"
        />
        {fieldErrors.password ? (
          <span
            id="register-password-error"
            role="alert"
            className="block text-red-600"
          >
            {fieldErrors.password}
          </span>
        ) : null}
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
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
