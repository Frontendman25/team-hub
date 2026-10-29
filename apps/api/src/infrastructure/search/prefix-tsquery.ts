const TOKEN = /[\p{L}\p{N}]+/gu
const TSQUERY_NOISE = /['\\:&|!()]/g

export function toPrefixTsQuery(raw: string): string | null {
  const tokens = [...raw.matchAll(TOKEN)]
    .map((match) => match[0]!.replace(TSQUERY_NOISE, '').toLowerCase())
    .filter((token) => token.length > 0)
    .slice(0, 8)

  if (tokens.length === 0) {
    return null
  }

  return tokens.map((token) => `${token}:*`).join(' & ')
}
