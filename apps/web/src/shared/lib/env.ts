export function getApiBaseUrl(): string {
  return process.env.API_INTERNAL_URL ?? '/api'
}

export function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL
  if (configured === undefined) {
    return 'http://localhost:3200'
  }
  return configured.replace(/\/$/, '')
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  return configured || 'http://localhost:3000'
}
