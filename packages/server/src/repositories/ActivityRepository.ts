import { createHash } from 'crypto'
import { eq, and, gt, desc, count, asc } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import {
  activities,
  rawEvents,
  type ActivityRow,
  type ActivityInsert,
  type RawEventRow,
} from '../db/schema/index.js'

export type { ActivityRow, RawEventRow }

export interface CreateRawEventData {
  sessionId: string
  eventType: string
  payload: string
}

export class ActivityRepository {
  constructor(private readonly db: Db) {}

  // Phase 1 intake buffer — writes to raw_events
  storeRawEvent(data: CreateRawEventData): number {
    const result = this.db
      .insert(rawEvents)
      .values({
        sessionId: data.sessionId,
        eventType: data.eventType,
        payload: data.payload,
      })
      .returning({ id: rawEvents.id })
      .get()
    return result.id
  }

  findRawEventsBySession(sessionId: string): RawEventRow[] {
    return this.db
      .select()
      .from(rawEvents)
      .where(eq(rawEvents.sessionId, sessionId))
      .orderBy(asc(rawEvents.createdAt))
      .all()
  }

  countRawEvents(): number {
    const result = this.db
      .select({ value: count() })
      .from(rawEvents)
      .get()
    return result?.value ?? 0
  }

  // Phase 2 activities table — AI-processed output with 30s content-hash dedup
  store(data: Omit<ActivityInsert, 'contentHash' | 'createdAt'>): ActivityRow | null {
    const hash = createHash('sha256')
      .update((data.sessionId ?? '') + (data.title ?? '') + (data.narrative ?? ''))
      .digest('hex')
      .slice(0, 32)

    const cutoff = Date.now() - 30_000
    const existing = this.db
      .select()
      .from(activities)
      .where(and(
        eq(activities.contentHash, hash),
        gt(activities.createdAt, cutoff),
      ))
      .get()

    if (existing) return null

    return this.db
      .insert(activities)
      .values({
        ...data,
        contentHash: hash,
        createdAt: Date.now(),
      })
      .returning()
      .get()
  }

  findBySession(sessionId: string): ActivityRow[] {
    return this.db
      .select()
      .from(activities)
      .where(eq(activities.sessionId, sessionId))
      .orderBy(asc(activities.createdAt))
      .all()
  }

  findByProject(project: string, limit = 50): ActivityRow[] {
    return this.db
      .select()
      .from(activities)
      .where(eq(activities.project, project))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .all()
  }

  findRecent(project?: string, limit = 50, offset = 0): ActivityRow[] {
    const query = this.db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset)

    if (project) {
      return query.where(eq(activities.project, project)).all()
    }
    return query.all()
  }

  countAll(): number {
    const result = this.db
      .select({ value: count() })
      .from(activities)
      .get()
    return result?.value ?? 0
  }
}
