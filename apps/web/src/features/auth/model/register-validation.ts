import { z } from 'zod'
import { ApiError } from '@/shared/lib/api'

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
  jobTitle: z
    .string()
    .trim()
    .max(120, 'Job title must be at most 120 characters')
    .optional()
    .transform((value) => value || undefined)
})

export type RegisterValues = z.output<typeof registerSchema>
export type RegisterFieldErrors = Partial<Record<keyof RegisterValues, string>>

export function registerFieldErrors(
  issues: readonly { path: string | readonly PropertyKey[]; message: string }[]
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}
  for (const issue of issues) {
    const field = typeof issue.path === 'string' ? issue.path : issue.path[0]
    if (
      field === 'displayName' ||
      field === 'email' ||
      field === 'password' ||
      field === 'jobTitle'
    ) {
      errors[field] ??= issue.message
    }
  }
  return errors
}

const serverValidation = z.object({
  issues: z.array(z.object({ path: z.string(), message: z.string() }))
})

export function registerServerError(cause: unknown): {
  fields: RegisterFieldErrors
  message: string | null
} {
  if (!(cause instanceof ApiError)) {
    return { fields: {}, message: 'Could not connect. Please try again.' }
  }
  if (cause.status === 400) {
    const parsed = serverValidation.safeParse(cause.body)
    if (parsed.success) {
      const fields = registerFieldErrors(parsed.data.issues)
      if (Object.keys(fields).length > 0) return { fields, message: null }
    }
    return {
      fields: {},
      message: 'Please check your registration details and try again.'
    }
  }
  if (cause.status === 409) {
    return { fields: { email: 'Email is already registered' }, message: null }
  }
  if (cause.status === 429) {
    return { fields: {}, message: 'Too many attempts. Please try again later.' }
  }
  return {
    fields: {},
    message:
      cause.status >= 500
        ? 'Could not create account right now. Please try again later.'
        : cause.message
  }
}
