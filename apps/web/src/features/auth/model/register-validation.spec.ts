import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/lib/api'
import {
  registerFieldErrors,
  registerSchema,
  registerServerError
} from './register-validation'

const valid = {
  displayName: 'Test User',
  email: 'user@example.com',
  password: 'password123',
  jobTitle: ''
}

describe('registration validation', () => {
  it('rejects a three-character password with only the password error', () => {
    const input = { ...valid, password: 'abc' }
    const parsed = registerSchema.safeParse(input)
    expect(parsed.success).toBe(false)
    if (parsed.success) throw new Error('Expected validation to fail')
    expect(registerFieldErrors(parsed.error.issues)).toEqual({
      password: 'Password must be at least 8 characters'
    })
    expect(input).toEqual({ ...valid, password: 'abc' })
  })

  it('reports name, email and password errors separately', () => {
    const parsed = registerSchema.safeParse({
      ...valid,
      displayName: ' ',
      email: 'invalid',
      password: ''
    })
    if (parsed.success) throw new Error('Expected validation to fail')
    expect(registerFieldErrors(parsed.error.issues)).toEqual({
      displayName: 'Name must be at least 2 characters',
      email: 'Enter a valid email address',
      password: 'Password must be at least 8 characters'
    })
  })

  it.each([8, 72])('accepts password length %i', (length) => {
    expect(
      registerSchema.safeParse({ ...valid, password: 'a'.repeat(length) })
        .success
    ).toBe(true)
  })

  it.each([
    ['displayName', 'a'.repeat(121)],
    ['email', `${'a'.repeat(245)}@example.com`],
    ['password', 'a'.repeat(73)],
    ['jobTitle', 'a'.repeat(121)]
  ])('enforces the server length limit for %s', (field, value) => {
    const parsed = registerSchema.safeParse({ ...valid, [field]: value })
    if (parsed.success) throw new Error('Expected validation to fail')
    expect(Object.keys(registerFieldErrors(parsed.error.issues))).toEqual([
      field
    ])
  })

  it('normalizes the request without altering entered values or trimming passwords', () => {
    const input = {
      ...valid,
      displayName: ' Test User ',
      email: ' user@example.com ',
      password: ' abcdef ',
      jobTitle: ' '
    }
    expect(registerSchema.parse(input)).toEqual({
      ...valid,
      password: ' abcdef ',
      jobTitle: undefined
    })
    expect(input.displayName).toBe(' Test User ')
    expect(input.email).toBe(' user@example.com ')
    expect(input.jobTitle).toBe(' ')
  })
})

describe('registration server errors', () => {
  it('maps the existing API validation issues to fields', () => {
    expect(
      registerServerError(
        new ApiError('Validation failed', 400, {
          code: 'VALIDATION_ERROR',
          issues: [
            { path: 'password', message: 'Password is invalid' },
            { path: 'email', message: 'Email is invalid' }
          ]
        })
      )
    ).toEqual({
      fields: { password: 'Password is invalid', email: 'Email is invalid' },
      message: null
    })
  })

  it('places the duplicate email error beside email', () => {
    expect(
      registerServerError(new ApiError('Email is already registered', 409))
    ).toEqual({
      fields: { email: 'Email is already registered' },
      message: null
    })
  })

  it.each([
    undefined,
    { issues: 'malformed' },
    { issues: [{ path: 'unknown', message: 'Invalid' }] }
  ])(
    'shows a useful fallback for unrecognized validation responses',
    (body) => {
      expect(
        registerServerError(new ApiError('Validation failed', 400, body))
      ).toEqual({
        fields: {},
        message: 'Please check your registration details and try again.'
      })
    }
  )

  it.each([
    [
      new ApiError('Internal server error', 500),
      'Could not create account right now. Please try again later.'
    ],
    [
      new ApiError('Too many requests', 429),
      'Too many attempts. Please try again later.'
    ],
    [new Error('fetch failed'), 'Could not connect. Please try again.'],
    [new ApiError('Origin not allowed', 403), 'Origin not allowed']
  ])('handles service, rate-limit and connection errors', (cause, message) => {
    expect(registerServerError(cause)).toEqual({ fields: {}, message })
  })
})
