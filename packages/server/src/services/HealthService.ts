import type { Db } from '../db/database.js'
import type { HealthResponse, StatsResponse } from '@memory-updater/shared'
import { sql, count } from 'drizzle-orm'
import { sessions, rawEvents, activities } from '../db/schema/index.js'
import { VERSION } from '../config.js'

export class HealthService {
  constructor(private readonly db: Db) {}

  async getHealth(): Promise<HealthResponse> {
    let dbOk = false
    try {
      this.db.run(sql`SELECT 1`)
      dbOk = true
    } catch {
      /* db not ready */
    }

    return {
      status: dbOk ? 'ok' : 'degraded',
      version: VERSION,
      uptime: process.uptime(),
      pid: process.pid,
      db: dbOk,
      timestamp: new Date().toISOString(),
    }
  }

  async getStats(): Promise<StatsResponse> {
    const sessionCount = this.db
      .select({ value: count() })
      .from(sessions)
      .get()?.value ?? 0

    const activityCount = this.db
      .select({ value: count() })
      .from(activities)
      .get()?.value ?? 0

    const rawEventCount = this.db
      .select({ value: count() })
      .from(rawEvents)
      .get()?.value ?? 0

    return { sessions: sessionCount, activities: activityCount, rawEvents: rawEventCount, uptime: process.uptime() }
  }
}
