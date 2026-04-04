import type { Db } from '../db/database.js'
import type { RawDb } from '../db/database.js'
import { SessionRepository } from '../repositories/SessionRepository.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { PromptRepository } from '../repositories/PromptRepository.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { LearningRepository } from '../repositories/LearningRepository.js'
import { LearningService } from './LearningService.js'
import { RETENTION } from '../config.js'
import { logger } from '../lib/logger.js'

export interface CleanupReport {
  startedAt: string
  completedAt: string
  deletions: Record<string, number>
}

export class CleanupService {
  private interval: ReturnType<typeof setInterval> | null = null
  private lastCleanupAt: string | null = null
  private nextCleanupAt: string | null = null

  private readonly sessionRepo: SessionRepository
  private readonly activityRepo: ActivityRepository
  private readonly summaryRepo: SummaryRepository
  private readonly promptRepo: PromptRepository
  private readonly queueRepo: PendingMessageRepository
  private readonly learningRepo: LearningRepository
  private readonly learningService: LearningService

  constructor(
    private readonly db: Db,
    private readonly rawDb: RawDb,
  ) {
    this.sessionRepo = new SessionRepository(db)
    this.activityRepo = new ActivityRepository(db)
    this.summaryRepo = new SummaryRepository(db)
    this.promptRepo = new PromptRepository(db)
    this.queueRepo = new PendingMessageRepository(db)
    this.learningRepo = new LearningRepository(db)
    this.learningService = new LearningService(db)
  }

  start(): void {
    // Run first cleanup after a short delay (don't block startup)
    setTimeout(() => this.runCleanup().catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : err }, 'initial cleanup failed')
    }), 5_000)

    const intervalMs = RETENTION.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000
    this.nextCleanupAt = new Date(Date.now() + intervalMs).toISOString()

    this.interval = setInterval(() => {
      this.runCleanup().catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : err }, 'scheduled cleanup failed')
      })
    }, intervalMs)
    this.interval.unref() // Don't prevent graceful shutdown

    logger.info({ intervalHours: RETENTION.CLEANUP_INTERVAL_HOURS }, 'cleanup service started')
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  async runCleanup(): Promise<CleanupReport> {
    const startedAt = new Date().toISOString()
    const deletions: Record<string, number> = {}

    logger.info('retention cleanup starting')

    // 1. Promote expiring summaries to learnings BEFORE deletion
    try {
      const expiring = this.summaryRepo.findExpiring(RETENTION.SUMMARIES_DAYS, 7)
      for (const summary of expiring) {
        try {
          await this.learningService.extractFromSummary(summary.id, summary.sessionId)
          this.summaryRepo.markProcessedForLearnings(summary.id)
        } catch (err) {
          logger.warn({ summaryId: summary.id, err: err instanceof Error ? err.message : err }, 'learning extraction failed for expiring summary')
          // Mark as processed anyway — data was available for 90 days
          this.summaryRepo.markProcessedForLearnings(summary.id)
        }
      }
      deletions.learningsPromoted = expiring.length
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : err }, 'summary promotion failed')
    }

    // 2. Delete in dependency order (children before parents)
    deletions.rawEvents = this.activityRepo.deleteRawEventsOlderThan(RETENTION.RAW_EVENTS_DAYS)
    deletions.pendingMessages = this.queueRepo.deleteOlderThan(RETENTION.PENDING_MESSAGES_DAYS)
    deletions.prompts = this.promptRepo.deleteOlderThan(RETENTION.PROMPTS_DAYS)
    deletions.activities = this.activityRepo.deleteOlderThan(RETENTION.ACTIVITIES_DAYS)
    deletions.summaries = this.summaryRepo.deleteOlderThan(RETENTION.SUMMARIES_DAYS)
    deletions.sessions = this.sessionRepo.deleteOlderThan(RETENTION.SESSIONS_DAYS)

    // 3. Decay stale learnings
    deletions.learningsDecayed = this.learningRepo.decayStale(RETENTION.LEARNING_DECAY_MONTHS)

    // 4. FTS5 index cleanup (remove orphaned rows)
    try {
      this.rawDb.exec(`DELETE FROM activities_fts WHERE rowid NOT IN (SELECT id FROM activities)`)
      this.rawDb.exec(`DELETE FROM summaries_fts WHERE rowid NOT IN (SELECT id FROM session_summaries)`)
      this.rawDb.exec(`DELETE FROM prompts_fts WHERE rowid NOT IN (SELECT id FROM user_prompts)`)
      this.rawDb.exec(`DELETE FROM learnings_fts WHERE rowid NOT IN (SELECT id FROM global_learnings)`)
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'FTS5 cleanup failed (non-fatal)')
    }

    // 5. VACUUM if significant deletions occurred
    const totalDeleted = Object.values(deletions).reduce((a, b) => a + b, 0)
    if (totalDeleted > 100) {
      try {
        this.rawDb.pragma('wal_checkpoint(TRUNCATE)')
        this.rawDb.exec('VACUUM')
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : err }, 'VACUUM failed (non-fatal)')
      }
    }

    const completedAt = new Date().toISOString()
    this.lastCleanupAt = completedAt

    const intervalMs = RETENTION.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000
    this.nextCleanupAt = new Date(Date.now() + intervalMs).toISOString()

    const report: CleanupReport = { startedAt, completedAt, deletions }
    logger.info({ report }, 'retention cleanup completed')
    return report
  }

  getStatus(): { lastCleanupAt: string | null; nextCleanupAt: string | null } {
    return { lastCleanupAt: this.lastCleanupAt, nextCleanupAt: this.nextCleanupAt }
  }

  getRetentionConfig() {
    return { ...RETENTION }
  }
}
