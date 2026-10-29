export function redactSqlParams(params: unknown[]): unknown[] {
  return params.map((param) => {
    if (typeof param === 'string' && param.startsWith('$argon2')) {
      return '[redacted-hash]'
    }
    return param
  })
}
