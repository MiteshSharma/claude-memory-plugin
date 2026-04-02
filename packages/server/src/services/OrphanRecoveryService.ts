import type { Db } from '../db/database.js'
import { SessionRepository } from '../repositories/SessionRepository.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { AGENT_ENABLED } from '../config.js'

const ORPHAN_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

export class OrphanRecoveryService {
  private readonly sessionRepo: SessionRepository
  private readonly queueRepo: PendingMessageRepository
  private readonly summaryRepo: SummaryRepository
  private readonly activityRepo: ActivityRepository

  constructor(private readonly db: Db) {
    this.sessionRepo = new SessionRepository(db)
    this.queueRepo = new PendingMessageRepository(db)
    this.summaryRepo = new SummaryRepository(db)
    this.activityRepo = new ActivityRepository(db)
  }

  async recoverOrphanedSessions(): Promise<number> {
    const orphans = this.sessionRepo.findOrphaned(ORPHAN_THRESHOLD_MS)

    if (orphans.length === 0) return 0

    console.log(`[orphan-recovery] found ${orphans.length} orphaned sessions`)

    for (const session of orphans) {
      try {
        // 1. Reset stuck processing messages
        this.queueRepo.resetStuck(session.sessionId)

        // 2. Generate partial summary from existing activities (if any)
        const activities = this.activityRepo.findBySession(session.sessionId)
        const existingSummary = this.summaryRepo.findBySession(session.sessionId)

        if (activities.length > 0 && existingSummary.length === 0) {
          // Create a basic summary from activities without AI (agent may not be available)
          this.summaryRepo.store({
            sessionDbId: session.id,
            sessionId: session.sessionId,
            project: session.project,
            request: 'Session ended unexpectedly — no user request captured.',
            investigated: activities.map((a) => a.title).slice(0, 3).join('; '),
            insights: '',
            completed: activities.map((a) => a.title).join('; '),
            pendingWork: '',
            notes: 'Session ended unexpectedly — partial summary generated from captured activities.',
            tokensUsed: 0,
          })
        }

        // 3. Mark session complete
        this.sessionRepo.markComplete(session.sessionId)
        console.log(`[orphan-recovery] recovered session=${session.sessionId}`)
      } catch (err) {
        console.error(
          `[orphan-recovery] failed for session=${session.sessionId}:`,
          err instanceof Error ? err.message : err,
        )
        // Still mark complete to prevent infinite recovery loops
        this.sessionRepo.markComplete(session.sessionId)
      }
    }

    return orphans.length
  }
}
