import { eq, desc, count } from 'drizzle-orm'
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

  countAll(): number {
    const result = this.db
      .select({ value: count() })
      .from(sessionSummaries)
      .get()
    return result?.value ?? 0
  }
}
