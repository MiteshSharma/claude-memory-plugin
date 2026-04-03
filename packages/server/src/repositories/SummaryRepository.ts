import { eq, desc, count, inArray } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import { sessionSummaries, type SummaryRow, type SummaryInsert } from '../db/schema/index.js'

export type { SummaryRow }

export class SummaryRepository {
  constructor(private readonly db: Db) {}

  store(data: Omit<SummaryInsert, 'createdAt'>): SummaryRow {
    return this.db
      .insert(sessionSummaries)
      .values({ ...data, createdAt: Date.now() })
      .returning()
      .get()
  }

  findBySession(sessionId: string): SummaryRow[] {
    return this.db
      .select()
      .from(sessionSummaries)
      .where(eq(sessionSummaries.sessionId, sessionId))
      .orderBy(desc(sessionSummaries.createdAt))
      .all()
  }

  findRecent(project?: string, limit = 20): SummaryRow[] {
    const query = this.db
      .select()
      .from(sessionSummaries)
      .orderBy(desc(sessionSummaries.createdAt))
      .limit(limit)

    if (project) {
      return query.where(eq(sessionSummaries.project, project)).all()
    }
    return query.all()
  }

  // Returns the latest summary per session as a Map<sessionId, SummaryRow>
  findLatestBySessionIds(sessionIds: string[]): Map<string, SummaryRow> {
    if (sessionIds.length === 0) return new Map()
    const rows = this.db
      .select()
      .from(sessionSummaries)
      .where(inArray(sessionSummaries.sessionId, sessionIds))
      .orderBy(desc(sessionSummaries.createdAt))
      .all()
    // Keep only the latest per sessionId (rows are desc by createdAt)
    const map = new Map<string, SummaryRow>()
    for (const row of rows) {
      if (!map.has(row.sessionId)) map.set(row.sessionId, row)
    }
    return map
  }

  countAll(): number {
    const result = this.db
      .select({ value: count() })
      .from(sessionSummaries)
      .get()
    return result?.value ?? 0
  }
}
