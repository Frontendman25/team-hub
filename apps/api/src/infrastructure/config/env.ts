import { z } from 'zod'

const optionalBool = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'))

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3200),
  POSTGRESQL_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  FRONTEND_URL: z.string().min(1).default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('debug'),
  SQL_TRACE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  GUEST_SESSION_HOURS: z.coerce.number().int().positive().default(4),
  ALLOW_DEMO_PERSONA_LOGIN: optionalBool,
  COOKIE_SECURE: optionalBool,
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim()
      return trimmed ? trimmed : undefined
    }),
  TRUST_PROXY: optionalBool,
  SOCKET_IO_REDIS_REQUIRED: optionalBool,
  RUN_BACKGROUND_JOBS: optionalBool,
  TRUSTED_PROXY_IPS: z.string().default('127.0.0.1,::1,::ffff:127.0.0.1'),
  AUTH_PROXY_SECRET: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim()
      return trimmed ? trimmed : undefined
    })
    .refine(
      (value) => value === undefined || value.length >= 16,
      'AUTH_PROXY_SECRET must be at least 16 characters'
    ),
  STORAGE_DRIVER: z.enum(['memory', 's3']).optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true')
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')

    throw new Error(`Invalid environment: ${details}`)
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.SQL_TRACE) {
    parsed.data.SQL_TRACE = false
  }

  if (parsed.data.ALLOW_DEMO_PERSONA_LOGIN === undefined) {
    parsed.data.ALLOW_DEMO_PERSONA_LOGIN = parsed.data.NODE_ENV !== 'production'
  }

  if (parsed.data.COOKIE_SECURE === undefined) {
    parsed.data.COOKIE_SECURE = parsed.data.NODE_ENV === 'production'
  }

  if (parsed.data.TRUST_PROXY === undefined) {
    parsed.data.TRUST_PROXY = parsed.data.NODE_ENV === 'production'
  }

  if (parsed.data.SOCKET_IO_REDIS_REQUIRED === undefined) {
    parsed.data.SOCKET_IO_REDIS_REQUIRED =
      parsed.data.NODE_ENV !== 'development'
  }

  if (parsed.data.RUN_BACKGROUND_JOBS === undefined) {
    parsed.data.RUN_BACKGROUND_JOBS = true
  }

  const driver =
    parsed.data.STORAGE_DRIVER ??
    (parsed.data.NODE_ENV === 'test' || !parsed.data.S3_ENDPOINT
      ? 'memory'
      : 's3')
  parsed.data.STORAGE_DRIVER = driver

  if (driver === 's3') {
    const missing = [
      'S3_ENDPOINT',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY'
    ].filter((name) => !parsed.data[name as keyof Env])
    if (missing.length > 0) {
      throw new Error(
        `Invalid environment: STORAGE_DRIVER=s3 requires ${missing.join(', ')}`
      )
    }
  }

  if (parsed.data.NODE_ENV === 'production' && driver === 'memory') {
    throw new Error(
      'Invalid environment: production requires STORAGE_DRIVER=s3'
    )
  }

  return parsed.data
}
