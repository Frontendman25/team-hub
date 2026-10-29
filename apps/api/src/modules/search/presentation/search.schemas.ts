import { z } from 'zod'
import { searchKinds, type SearchKind } from '../domain/search.repository'

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  kinds: z
    .string()
    .optional()
    .transform((value): SearchKind[] => {
      if (!value) {
        return [...searchKinds]
      }
      const parsed = value
        .split(',')
        .map((part) => part.trim())
        .filter((part): part is SearchKind =>
          (searchKinds as readonly string[]).includes(part)
        )
      return parsed.length > 0 ? parsed : [...searchKinds]
    })
})

export type SearchQueryDto = z.infer<typeof searchQuerySchema>
