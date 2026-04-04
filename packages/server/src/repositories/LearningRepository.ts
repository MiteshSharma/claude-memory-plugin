import { eq, desc, count, sql, and, lt } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import { globalLearnings, type LearningRow, type LearningInsert } from '../db/schema/index.js'

export type { LearningRow }

export interface CreateLearningData {
  canonicalKey: string
  category: string
  pattern: string
  topics: string[]
  sourceSummaryId?: number
}

export class LearningRepository {
  constructor(private readonly db: Db) {}

  store(data: CreateLearningData): LearningRow {
    const now = Date.now()
    const sourceSummaryIds = data.sourceSummaryId ? JSON.stringify([data.sourceSummaryId]) : '[]'
    return this.db
      .insert(globalLearnings)
      .values({
        canonicalKey: data.canonicalKey,
        category: data.category,
        pattern: data.pattern,
        topics: JSON.stringify(data.topics),
        sourceSummaryIds,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .returning()
      .get()
  }

  findByKey(canonicalKey: string): LearningRow | undefined {
    return this.db
      .select()
      .from(globalLearnings)
      .where(eq(globalLearnings.canonicalKey, canonicalKey))
      .get()
  }

  incrementConfidence(id: number, newPattern?: string, sourceSummaryId?: number): void {
    const existing = this.db
      .select()
      .from(globalLearnings)
      .where(eq(globalLearnings.id, id))
      .get()

    if (!existing) return

    const updates: Partial<LearningInsert> = {
      confidence: existing.confidence + 0.8,
      evidenceCount: existing.evidenceCount + 1,
      lastSeenAt: Date.now(),
      archived: 0, // re-observation un-archives
    }

    if (newPattern) {
      updates.pattern = newPattern
    }

    if (sourceSummaryId) {
      const ids: number[] = JSON.parse(existing.sourceSummaryIds)
      if (!ids.includes(sourceSummaryId)) {
        ids.push(sourceSummaryId)
        updates.sourceSummaryIds = JSON.stringify(ids)
      }
    }

    this.db
      .update(globalLearnings)
      .set(updates)
      .where(eq(globalLearnings.id, id))
      .run()
  }

  findByTopics(topics: string[], limit = 15): LearningRow[] {
    if (topics.length === 0) return []

    // Match learnings where any topic overlaps, ordered by confidence
    const conditions = topics.map(
      (t) => sql`${globalLearnings.topics} LIKE ${'%"' + t + '"%'}`,
    )
    const orCondition = sql.join(conditions, sql` OR `)

    return this.db
      .select()
      .from(globalLearnings)
      .where(and(eq(globalLearnings.archived, 0), orCondition))
      .orderBy(desc(globalLearnings.confidence))
      .limit(limit)
      .all()
  }

  findByCategory(category: string, limit = 20): LearningRow[] {
    return this.db
      .select()
      .from(globalLearnings)
      .where(and(eq(globalLearnings.category, category), eq(globalLearnings.archived, 0)))
      .orderBy(desc(globalLearnings.confidence))
      .limit(limit)
      .all()
  }

  findAll(opts: { limit?: number; offset?: number; includeArchived?: boolean }): { learnings: LearningRow[]; total: number } {
    const limit = opts.limit ?? 20
    const offset = opts.offset ?? 0

    const condition = opts.includeArchived ? undefined : eq(globalLearnings.archived, 0)

    const total = this.db
      .select({ value: count() })
      .from(globalLearnings)
      .where(condition)
      .get()?.value ?? 0

    const learnings = this.db
      .select()
      .from(globalLearnings)
      .where(condition)
      .orderBy(desc(globalLearnings.confidence))
      .limit(limit)
      .offset(offset)
      .all()

    return { learnings, total }
  }

  search(query: string, limit = 20): LearningRow[] {
    if (!query.trim()) return this.findAll({ limit }).learnings

    const ids = this.db.all<{ id: number }>(sql`
      SELECT rowid as id FROM learnings_fts
      WHERE learnings_fts MATCH ${query}
      LIMIT ${limit}
    `)

    if (ids.length === 0) return []

    const idList = ids.map((r) => r.id)
    return this.db
      .select()
      .from(globalLearnings)
      .where(sql`${globalLearnings.id} IN (${sql.join(idList.map((id) => sql`${id}`), sql`, `)})`)
      .orderBy(desc(globalLearnings.confidence))
      .all()
  }

  setConfidence(id: number, confidence: number): void {
    this.db
      .update(globalLearnings)
      .set({ confidence })
      .where(eq(globalLearnings.id, id))
      .run()
  }

  archive(id: number): void {
    this.db
      .update(globalLearnings)
      .set({ archived: 1 })
      .where(eq(globalLearnings.id, id))
      .run()
  }

  delete(id: number): void {
    this.db.delete(globalLearnings).where(eq(globalLearnings.id, id)).run()
  }

  /** Reduce confidence for learnings not seen in N months, archive if below threshold */
  decayStale(months: number): number {
    const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000
    let decayed = 0

    // Reduce confidence by 0.5 for stale learnings
    const stale = this.db
      .select()
      .from(globalLearnings)
      .where(and(lt(globalLearnings.lastSeenAt, cutoff), eq(globalLearnings.archived, 0)))
      .all()

    for (const learning of stale) {
      const newConfidence = Math.max(0, learning.confidence - 0.5)
      this.db
        .update(globalLearnings)
        .set({
          confidence: newConfidence,
          archived: newConfidence < 0.5 ? 1 : 0,
        })
        .where(eq(globalLearnings.id, learning.id))
        .run()
      decayed++
    }

    return decayed
  }

  countAll(): number {
    return this.db
      .select({ value: count() })
      .from(globalLearnings)
      .get()?.value ?? 0
  }

  getStats(): { total: number; byCategory: Record<string, number>; avgConfidence: number } {
    const total = this.countAll()
    const categories = this.db.all<{ category: string; cnt: number }>(sql`
      SELECT category, COUNT(*) as cnt FROM global_learnings
      WHERE archived = 0
      GROUP BY category
    `)
    const byCategory: Record<string, number> = {}
    for (const c of categories) byCategory[c.category] = c.cnt

    const avg = this.db.get<{ avg: number }>(sql`
      SELECT AVG(confidence) as avg FROM global_learnings WHERE archived = 0
    `)

    return { total, byCategory, avgConfidence: Math.round((avg?.avg ?? 0) * 10) / 10 }
  }
}
