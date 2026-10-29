import { QueryClient } from '@tanstack/react-query'
import { cache } from 'react'

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false
      }
    }
  })
}

let browserClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  browserClient ??= makeQueryClient()
  return browserClient
}

export const getServerQueryClient = cache(makeQueryClient)
