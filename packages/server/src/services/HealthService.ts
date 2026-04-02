import type { Db } from '../db/database.js'
import type { HealthResponse, StatsResponse } from '@claude-plugin-kit/shared'
import { VERSION } from '../config.js'

export class HealthService {
  constructor(private readonly db: Db) {}

  async getHealth(): Promise<HealthResponse> {
    let dbOk = false
    try {
      this.db.prepare('SELECT 1').get()
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
    const sessions = (
      this.db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }
    ).c
    const activities = (
      this.db.prepare('SELECT COUNT(*) as c FROM raw_events').get() as { c: number }
    ).c
    return { sessions, activities, uptime: process.uptime() }
  }
}
