import { sql } from 'drizzle-orm'
import type { Database } from '../../../infrastructure/database/drizzle.service'
import type {
  SearchHitRecord,
  SearchKind,
  SearchQueryInput,
  SearchRepository
} from '../domain/search.repository'

type RawHit = {
  kind: SearchKind
  id: string
  title: string
  snippet: string
  rank: number | string
  conversation_id: string | null
  author_name: string | null
}

function stripHeadline(value: string): string {
  return value.replace(/<\/?b>/gi, '').trim()
}

function rowsOf(result: unknown): RawHit[] {
  if (Array.isArray(result)) {
    return result as RawHit[]
  }
  if (
    result &&
    typeof result === 'object' &&
    'rows' in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: RawHit[] }).rows
  }
  return []
}

function toHit(row: RawHit): SearchHitRecord {
  return {
    kind: row.kind,
    id: row.id,
    title: row.title,
    snippet: stripHeadline(row.snippet ?? ''),
    rank: Number(row.rank),
    conversationId: row.conversation_id,
    authorName: row.author_name
  }
}

export class DrizzleSearchRepository implements SearchRepository {
  constructor(private readonly db: Database) {}

  async search(input: SearchQueryInput): Promise<SearchHitRecord[]> {
    const tasks: Promise<SearchHitRecord[]>[] = []
    if (input.kinds.includes('person')) {
      tasks.push(this.people(input))
    }
    if (input.kinds.includes('channel')) {
      tasks.push(this.channels(input))
    }
    if (input.kinds.includes('post')) {
      tasks.push(this.posts(input))
    }
    if (input.kinds.includes('message')) {
      tasks.push(this.messages(input))
    }

    const groups = await Promise.all(tasks)
    return groups
      .flat()
      .sort(
        (left, right) =>
          right.rank - left.rank || left.title.localeCompare(right.title)
      )
  }

  private async people(input: SearchQueryInput): Promise<SearchHitRecord[]> {
    const rows = await this.db.execute(sql`
      SELECT
        'person'::text AS kind,
        p.user_id::text AS id,
        p.display_name AS title,
        ts_headline(
          'simple'::regconfig,
          coalesce(p.job_title, '') || ' ' || coalesce(p.bio, ''),
          to_tsquery('simple', ${input.tsQuery}),
          'MaxWords=18,MinWords=6,MaxFragments=1'
        ) AS snippet,
        ts_rank_cd(p.search_vector, to_tsquery('simple', ${input.tsQuery})) AS rank,
        NULL::text AS conversation_id,
        NULL::text AS author_name
      FROM profiles p
      INNER JOIN workspace_members wm
        ON wm.user_id = p.user_id
      WHERE wm.workspace_id = ${input.workspaceId}::uuid
        AND p.search_vector @@ to_tsquery('simple', ${input.tsQuery})
      ORDER BY rank DESC, p.display_name ASC
      LIMIT ${input.perKind}
    `)
    return rowsOf(rows).map(toHit)
  }

  private async channels(input: SearchQueryInput): Promise<SearchHitRecord[]> {
    const rows = await this.db.execute(sql`
      SELECT
        'channel'::text AS kind,
        c.id::text AS id,
        coalesce(c.name, 'channel') AS title,
        ts_headline(
          'simple'::regconfig,
          coalesce(c.topic, ''),
          to_tsquery('simple', ${input.tsQuery}),
          'MaxWords=18,MinWords=6,MaxFragments=1'
        ) AS snippet,
        ts_rank_cd(c.search_vector, to_tsquery('simple', ${input.tsQuery})) AS rank,
        c.id::text AS conversation_id,
        NULL::text AS author_name
      FROM conversations c
      WHERE c.workspace_id = ${input.workspaceId}::uuid
        AND c.type = 'channel'
        AND c.search_vector @@ to_tsquery('simple', ${input.tsQuery})
      ORDER BY rank DESC, c.name ASC
      LIMIT ${input.perKind}
    `)
    return rowsOf(rows).map(toHit)
  }

  private async posts(input: SearchQueryInput): Promise<SearchHitRecord[]> {
    const rows = await this.db.execute(sql`
      SELECT
        'post'::text AS kind,
        p.id::text AS id,
        left(p.content, 80) AS title,
        ts_headline(
          'simple'::regconfig,
          p.content,
          to_tsquery('simple', ${input.tsQuery}),
          'MaxWords=18,MinWords=6,MaxFragments=1'
        ) AS snippet,
        ts_rank_cd(p.search_vector, to_tsquery('simple', ${input.tsQuery})) AS rank,
        NULL::text AS conversation_id,
        pr.display_name AS author_name
      FROM posts p
      INNER JOIN profiles pr ON pr.user_id = p.author_id
      WHERE p.workspace_id = ${input.workspaceId}::uuid
        AND p.search_vector @@ to_tsquery('simple', ${input.tsQuery})
      ORDER BY rank DESC, p.created_at DESC
      LIMIT ${input.perKind}
    `)
    return rowsOf(rows).map(toHit)
  }

  private async messages(input: SearchQueryInput): Promise<SearchHitRecord[]> {
    const rows = await this.db.execute(sql`
      SELECT
        'message'::text AS kind,
        m.id::text AS id,
        left(m.content, 80) AS title,
        ts_headline(
          'simple'::regconfig,
          m.content,
          to_tsquery('simple', ${input.tsQuery}),
          'MaxWords=18,MinWords=6,MaxFragments=1'
        ) AS snippet,
        ts_rank_cd(m.search_vector, to_tsquery('simple', ${input.tsQuery})) AS rank,
        m.conversation_id::text AS conversation_id,
        pr.display_name AS author_name
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      INNER JOIN profiles pr ON pr.user_id = m.author_id
      LEFT JOIN conversation_members cm
        ON cm.conversation_id = c.id
        AND cm.user_id = ${input.actorId}::uuid
      WHERE c.workspace_id = ${input.workspaceId}::uuid
        AND m.deleted_at IS NULL
        AND m.search_vector @@ to_tsquery('simple', ${input.tsQuery})
        AND (
          c.type = 'channel'
          OR cm.user_id = ${input.actorId}::uuid
        )
      ORDER BY rank DESC, m.created_at DESC
      LIMIT ${input.perKind}
    `)
    return rowsOf(rows).map(toHit)
  }
}
