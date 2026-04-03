import { sql, eq, and, gte, lte, desc, inArray } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import {
  activities,
  sessionSummaries,
  userPrompts,
  type ActivityRow,
  type SummaryRow,
  type PromptRow,
} from '../db/schema/index.js'

export interface SearchOptions {
  query: string
  project?: string | undefined
  type?: string | undefined
  fromDate?: number | undefined
  toDate?: number | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface SearchResult {
  id: number
  type: string
  title: string | null
  project: string
  createdAt: string
  score?: number
}

export class SearchRepository {
  constructor(private readonly db: Db) {}

  searchActivities(opts: SearchOptions): SearchResult[] {
    const limit = opts.limit ?? 20
    const offset = opts.offset ?? 0

    if (!opts.query.trim()) {
      return this.filterActivities(opts)
    }

    // FTS5 MATCH query
    const ftsQuery = this.sanitizeFtsQuery(opts.query)
    const rows = this.db.all<{
      id: number
      title: string
      type: string
      project: string
      created_at: number
      rank: number
    }>(sql`
      SELECT a.id, a.title, a.type, a.project, a.created_at, rank
      FROM activities_fts fts
      JOIN activities a ON a.id = fts.rowid
      WHERE activities_fts MATCH ${ftsQuery}
      ${opts.project ? sql`AND a.project = ${opts.project}` : sql``}
      ${opts.type ? sql`AND a.type = ${opts.type}` : sql``}
      ${opts.fromDate ? sql`AND a.created_at >= ${opts.fromDate}` : sql``}
      ${opts.toDate ? sql`AND a.created_at <= ${opts.toDate}` : sql``}
      ORDER BY rank
      LIMIT ${limit} OFFSET ${offset}
    `)

    return rows.map((r) => ({
      id: r.id,
      type: r.type ?? 'activity',
      title: r.title,
      project: r.project,
      createdAt: new Date(r.created_at).toISOString(),
      score: Math.abs(r.rank),
    }))
  }

  searchSummaries(opts: SearchOptions): SearchResult[] {
    const limit = opts.limit ?? 20

    if (!opts.query.trim()) {
      const summaries = this.db
        .select()
        .from(sessionSummaries)
        .orderBy(desc(sessionSummaries.createdAt))
        .limit(limit)
        .all()

      return summaries.map((s) => ({
        id: s.id,
        type: 'summary',
        title: s.request,
        project: s.project,
        createdAt: new Date(s.createdAt).toISOString(),
      }))
    }

    const ftsQuery = this.sanitizeFtsQuery(opts.query)
    const rows = this.db.all<{
      id: number
      request: string
      project: string
      created_at: number
      rank: number
    }>(sql`
      SELECT s.id, s.request, s.project, s.created_at, rank
      FROM summaries_fts fts
      JOIN session_summaries s ON s.id = fts.rowid
      WHERE summaries_fts MATCH ${ftsQuery}
      ${opts.project ? sql`AND s.project = ${opts.project}` : sql``}
      ORDER BY rank
      LIMIT ${limit}
    `)

    return rows.map((r) => ({
      id: r.id,
      type: 'summary',
      title: r.request,
      project: r.project,
      createdAt: new Date(r.created_at).toISOString(),
      score: Math.abs(r.rank),
    }))
  }

  searchPrompts(opts: SearchOptions): SearchResult[] {
    const limit = opts.limit ?? 20

    if (!opts.query.trim()) {
      return []
    }

    const ftsQuery = this.sanitizeFtsQuery(opts.query)
    const rows = this.db.all<{
      id: number
      prompt_text: string
      content_session_id: string
      project: string
      created_at: string
      rank: number
    }>(sql`
      SELECT p.id, p.prompt_text, p.content_session_id, p.project, p.created_at, rank
      FROM prompts_fts fts
      JOIN user_prompts p ON p.id = fts.rowid
      WHERE prompts_fts MATCH ${ftsQuery}
      ${opts.project ? sql`AND p.project = ${opts.project}` : sql``}
      ORDER BY rank
      LIMIT ${limit}
    `)

    return rows.map((r) => ({
      id: r.id,
      type: 'prompt',
      title: r.prompt_text.slice(0, 200),
      project: r.project,
      createdAt: r.created_at,
      score: Math.abs(r.rank),
    }))
  }

  getActivityById(id: number): ActivityRow | undefined {
    return this.db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .get()
  }

  getActivitiesByIds(ids: number[]): ActivityRow[] {
    if (ids.length === 0) return []
    return this.db
      .select()
      .from(activities)
      .where(inArray(activities.id, ids))
      .all()
  }

  getTimeline(
    anchorId: number,
    depthBefore = 5,
    depthAfter = 5,
  ): ActivityRow[] {
    const anchor = this.getActivityById(anchorId)
    if (!anchor) return []

    const before = this.db
      .select()
      .from(activities)
      .where(and(
        eq(activities.project, anchor.project),
        lte(activities.createdAt, anchor.createdAt),
      ))
      .orderBy(desc(activities.createdAt))
      .limit(depthBefore + 1)
      .all()
      .reverse()

    const after = this.db
      .select()
      .from(activities)
      .where(and(
        eq(activities.project, anchor.project),
        gte(activities.createdAt, anchor.createdAt),
      ))
      .orderBy(activities.createdAt)
      .limit(depthAfter + 1)
      .all()

    // Merge and deduplicate
    const seen = new Set<number>()
    const result: ActivityRow[] = []
    for (const a of [...before, ...after]) {
      if (!seen.has(a.id)) {
        seen.add(a.id)
        result.push(a)
      }
    }
    return result
  }

  private filterActivities(opts: SearchOptions): SearchResult[] {
    const limit = opts.limit ?? 20
    const offset = opts.offset ?? 0
    const conditions = []

    if (opts.project) conditions.push(eq(activities.project, opts.project))
    if (opts.type) conditions.push(eq(activities.type, opts.type))
    if (opts.fromDate) conditions.push(gte(activities.createdAt, opts.fromDate))
    if (opts.toDate) conditions.push(lte(activities.createdAt, opts.toDate))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = this.db
      .select()
      .from(activities)
      .where(where)
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset)
      .all()

    return rows.map((r) => ({
      id: r.id,
      type: r.type ?? 'activity',
      title: r.title,
      project: r.project,
      createdAt: new Date(r.createdAt).toISOString(),
    }))
  }

  private sanitizeFtsQuery(query: string): string {
    // Escape special FTS5 characters and wrap terms for prefix matching
    return query
      .replace(/['"*()]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => `"${t}"`)
      .join(' ')
  }
}
