import type { Request } from 'express'

export type TeamHubRequest = Request & {
  userId?: string
}
