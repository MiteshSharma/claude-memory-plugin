import type { Db } from '../db/database.js'

export interface RawEventRow {
  id: number
  session_id: string
  event_type: string
  payload: string
  created_at: string
}

export interface CreateRawEventData {
  sessionId: string
  eventType: string
  payload: string
}

export class ActivityRepository {
  constructor(private readonly db: Db) {}

  storeRawEvent(data: CreateRawEventData): number {
    const result = this.db
      .prepare(
        `INSERT INTO raw_events (session_id, event_type, payload)
         VALUES (?, ?, ?)
         RETURNING id`,
      )
      .get(data.sessionId, data.eventType, data.payload) as { id: number }
    return result.id
  }

  findBySession(sessionId: string): RawEventRow[] {
    return this.db
      .prepare('SELECT * FROM raw_events WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as RawEventRow[]
  }

  countAll(): number {
    return (
      this.db.prepare('SELECT COUNT(*) as c FROM raw_events').get() as { c: number }
    ).c
  }
}
