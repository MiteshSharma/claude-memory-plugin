import { eq, and, lt, sql, count, inArray } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import { pendingMessages, type PendingMessageRow, type PendingMessageInsert } from '../db/schema/index.js'

export type { PendingMessageRow }

export class PendingMessageRepository {
  constructor(private readonly db: Db) {}

  enqueue(data: Omit<PendingMessageInsert, 'status' | 'retryCount' | 'createdAt'>): PendingMessageRow {
    return this.db
      .insert(pendingMessages)
      .values({
        ...data,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
      })
      .returning()
      .get()
  }

  claimNext(sessionId: string): PendingMessageRow | undefined {
    const staleThreshold = Date.now() - 60_000

    // Reset stale processing rows (claimed > 60s ago)
    this.db
      .update(pendingMessages)
      .set({ status: 'pending', claimedAt: null })
      .where(and(
        eq(pendingMessages.status, 'processing'),
        eq(pendingMessages.sessionId, sessionId),
        lt(pendingMessages.claimedAt, staleThreshold),
      ))
      .run()

    // Find next pending message
    const next = this.db
      .select()
      .from(pendingMessages)
      .where(and(
        eq(pendingMessages.status, 'pending'),
        eq(pendingMessages.sessionId, sessionId),
      ))
      .orderBy(pendingMessages.createdAt)
      .limit(1)
      .get()

    if (!next) return undefined

    // Claim it
    this.db
      .update(pendingMessages)
      .set({ status: 'processing', claimedAt: Date.now() })
      .where(eq(pendingMessages.id, next.id))
      .run()

    return { ...next, status: 'processing', claimedAt: Date.now() }
  }

  confirmProcessed(id: number): void {
    this.db
      .delete(pendingMessages)
      .where(eq(pendingMessages.id, id))
      .run()
  }

  markFailed(id: number, errorMessage: string): void {
    this.db
      .update(pendingMessages)
      .set({
        status: 'failed',
        errorMessage,
        retryCount: sql`retry_count + 1`,
      })
      .where(eq(pendingMessages.id, id))
      .run()
  }

  getAllPending(): PendingMessageRow[] {
    return this.db
      .select()
      .from(pendingMessages)
      .where(eq(pendingMessages.status, 'pending'))
      .orderBy(pendingMessages.createdAt)
      .all()
  }

  resetStuck(sessionId: string): void {
    const staleThreshold = Date.now() - 60_000
    this.db
      .update(pendingMessages)
      .set({ status: 'pending', claimedAt: null })
      .where(and(
        eq(pendingMessages.sessionId, sessionId),
        eq(pendingMessages.status, 'processing'),
        lt(pendingMessages.claimedAt, staleThreshold),
      ))
      .run()
  }

  getSessionsWithPending(): string[] {
    const rows = this.db
      .selectDistinct({ sessionId: pendingMessages.sessionId })
      .from(pendingMessages)
      .where(inArray(pendingMessages.status, ['pending', 'processing']))
      .all()
    return rows.map((r) => r.sessionId)
  }

  listAll(opts: { status?: string; sessionId?: string; limit?: number }): PendingMessageRow[] {
    const limit = opts.limit ?? 50
    const conditions = []

    if (opts.status && opts.status !== 'all') {
      conditions.push(eq(pendingMessages.status, opts.status))
    }
    if (opts.sessionId) {
      conditions.push(eq(pendingMessages.sessionId, opts.sessionId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    return this.db
      .select()
      .from(pendingMessages)
      .where(where)
      .orderBy(pendingMessages.createdAt)
      .limit(limit)
      .all()
  }

  /** Delete processed/failed queue items older than N days. Returns count deleted. */
  deleteOlderThan(days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const result = this.db
      .delete(pendingMessages)
      .where(and(
        inArray(pendingMessages.status, ['processed', 'failed']),
        lt(pendingMessages.createdAt, cutoff),
      ))
      .returning({ id: pendingMessages.id })
      .all()
    return result.length
  }

  countByStatus(): { pending: number; processing: number; failed: number } {
    const rows = this.db
      .select({
        status: pendingMessages.status,
        value: count(),
      })
      .from(pendingMessages)
      .groupBy(pendingMessages.status)
      .all()

    const result = { pending: 0, processing: 0, failed: 0 }
    for (const row of rows) {
      if (row.status in result) {
        result[row.status as keyof typeof result] = row.value
      }
    }
    return result
  }
}
