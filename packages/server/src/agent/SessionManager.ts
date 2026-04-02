import type { Db } from '../db/database.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { SessionQueueProcessor } from './SessionQueueProcessor.js'
import { AGENT_ENABLED } from '../config.js'

const STALE_REAPER_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
const STALE_SESSION_THRESHOLD_MS = 6 * 60 * 60 * 1000 // 6 hours

interface ActiveSession {
  processor: SessionQueueProcessor
  promise: Promise<void>
  lastActivity: number
}

export class SessionManager {
  private readonly sessions = new Map<string, ActiveSession>()
  private readonly queueRepo: PendingMessageRepository
  private reaperInterval: ReturnType<typeof setInterval> | null = null

  constructor(private readonly db: Db) {
    this.queueRepo = new PendingMessageRepository(db)
  }

  async start(): Promise<void> {
    if (!AGENT_ENABLED) {
      console.log('[session-manager] agent disabled (no ANTHROPIC_API_KEY)')
      return
    }

    // Recover pending messages from previous server run
    const pendingSessions = this.queueRepo.getSessionsWithPending()
    for (const sessionId of pendingSessions) {
      this.ensureProcessor(sessionId)
    }

    if (pendingSessions.length > 0) {
      console.log(`[session-manager] recovered ${pendingSessions.length} sessions with pending work`)
    }

    // Start stale reaper
    this.reaperInterval = setInterval(() => this.reapStaleSessions(), STALE_REAPER_INTERVAL_MS)
    console.log('[session-manager] started')
  }

  enqueue(sessionId: string): void {
    if (!AGENT_ENABLED) return
    this.ensureProcessor(sessionId)
  }

  stop(): void {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval)
      this.reaperInterval = null
    }

    for (const [sessionId, session] of this.sessions) {
      session.processor.stop()
      console.log(`[session-manager] stopped processor for session=${sessionId}`)
    }
    this.sessions.clear()
    console.log('[session-manager] stopped')
  }

  getStatus(): { activeSessions: number; sessionIds: string[] } {
    const sessionIds = Array.from(this.sessions.keys())
    return { activeSessions: sessionIds.length, sessionIds }
  }

  private ensureProcessor(sessionId: string): void {
    const existing = this.sessions.get(sessionId)
    if (existing?.processor.isRunning()) {
      existing.processor.notify()
      existing.lastActivity = Date.now()
      return
    }

    const processor = new SessionQueueProcessor(this.db, sessionId)
    const promise = processor.start().then(() => {
      // Processor stopped (idle timeout or explicit stop) — clean up
      this.sessions.delete(sessionId)
    })

    this.sessions.set(sessionId, {
      processor,
      promise,
      lastActivity: Date.now(),
    })

    processor.notify()
  }

  private reapStaleSessions(): void {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > STALE_SESSION_THRESHOLD_MS) {
        console.log(`[session-manager] reaping stale session=${sessionId}`)
        session.processor.stop()
        this.sessions.delete(sessionId)
      }
    }
  }
}
