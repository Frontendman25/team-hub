const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

export function isMutatingMethod(method: string | undefined): boolean {
  return Boolean(method && MUTATING.has(method.toUpperCase()))
}

export function originAllowed(
  originHeader: string | undefined,
  allowedOrigin: string
): boolean {
  if (!originHeader) {
    return true
  }

  try {
    return new URL(originHeader).origin === new URL(allowedOrigin).origin
  } catch {
    return false
  }
}
