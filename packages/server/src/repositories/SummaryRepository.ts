import { eq, desc, count, inArray, lt, and } from 'drizzle-orm'
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

  /** Find summaries expiring within bufferDays that haven't been processed for learnings */
  findExpiring(ttlDays: number, bufferDays: number): SummaryRow[] {
    const cutoff = Date.now() - (ttlDays - bufferDays) * 24 * 60 * 60 * 1000
    return this.db
      .select()
      .from(sessionSummaries)
      .where(and(
        lt(sessionSummaries.createdAt, cutoff),
        eq(sessionSummaries.processedForLearnings, 0),
      ))
      .all()
  }

  markProcessedForLearnings(id: number): void {
    this.db
      .update(sessionSummaries)
      .set({ processedForLearnings: 1 })
      .where(eq(sessionSummaries.id, id))
      .run()
  }

  /** Delete summaries older than N days. Returns count deleted. */
  deleteOlderThan(days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const result = this.db
      .delete(sessionSummaries)
      .where(lt(sessionSummaries.createdAt, cutoff))
      .returning({ id: sessionSummaries.id })
      .all()
    return result.length
  }
}
