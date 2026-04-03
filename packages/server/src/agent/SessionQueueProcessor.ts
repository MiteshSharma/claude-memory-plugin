import { EventEmitter } from 'events'
import type { Db } from '../db/database.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { PromptRepository } from '../repositories/PromptRepository.js'
import { SessionRepository } from '../repositories/SessionRepository.js'
import { ObserverAgent, type ExtractedActivity } from './ObserverAgent.js'
import { logger } from '../lib/logger.js'

const IDLE_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

export class SessionQueueProcessor {
  private readonly queueRepo: PendingMessageRepository
  private readonly activityRepo: ActivityRepository
  private readonly summaryRepo: SummaryRepository
  private readonly promptRepo: PromptRepository
  private readonly sessionRepo: SessionRepository
  private readonly agent: ObserverAgent
  private readonly emitter = new EventEmitter()
  private running = false
  private idleTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly db: Db,
    private readonly sessionId: string,
  ) {
    this.queueRepo = new PendingMessageRepository(db)
    this.activityRepo = new ActivityRepository(db)
    this.summaryRepo = new SummaryRepository(db)
    this.promptRepo = new PromptRepository(db)
    this.sessionRepo = new SessionRepository(db)
    this.agent = new ObserverAgent()
  }

  notify(): void {
    this.emitter.emit('work')
    this.resetIdleTimer()
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.resetIdleTimer()
    logger.info({ sessionId: this.sessionId }, 'processor started')

    while (this.running) {
      const message = this.queueRepo.claimNext(this.sessionId)

      if (!message) {
        // Wait for work notification or idle timeout
        await new Promise<void>((resolve) => {
          const onWork = () => { cleanup(); resolve() }
          const onStop = () => { cleanup(); resolve() }
          const cleanup = () => {
            this.emitter.removeListener('work', onWork)
            this.emitter.removeListener('stop', onStop)
          }
          this.emitter.once('work', onWork)
          this.emitter.once('stop', onStop)
        })
        continue
      }

      this.resetIdleTimer()

      try {
        if (message.messageType === 'tool_use') {
          await this.processToolUse(message.id, message)
        } else if (message.messageType === 'summarize') {
          await this.processSummarize(message.id)
        } else {
          // Unknown message type — confirm and skip
          this.queueRepo.confirmProcessed(message.id)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        logger.error({ sessionId: this.sessionId, messageId: message.id, err: errorMsg }, 'message processing failed')
        this.queueRepo.markFailed(message.id, errorMsg)
      }
    }

    logger.info({ sessionId: this.sessionId }, 'processor stopped')
  }

  stop(): void {
    this.running = false
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.emitter.emit('stop')
  }

  isRunning(): boolean {
    return this.running
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      logger.info({ sessionId: this.sessionId }, 'processor idle timeout')
      this.stop()
    }, IDLE_TIMEOUT_MS)
  }

  private async processToolUse(
    messageId: number,
    message: { toolName: string | null; toolInput: string | null; toolResponse: string | null; workDir: string | null },
  ): Promise<void> {
    const toolName = message.toolName ?? 'unknown'
    const toolInput = message.toolInput ? JSON.parse(message.toolInput) : {}
    const toolResponse = message.toolResponse ? JSON.parse(message.toolResponse) : {}

    const { activities, tokensUsed } = await this.agent.extractActivities(
      toolName,
      toolInput,
      toolResponse,
    )

    if (activities.length === 0) {
      this.queueRepo.confirmProcessed(messageId)
      return
    }

    // Look up session — auto-create if user-prompt-submit hook lost the race
    let session = this.sessionRepo.findBySessionId(this.sessionId)
    if (!session) {
      const workDir = message.workDir ?? ''
      const project = workDir.split('/').filter(Boolean).pop() ?? 'unknown'
      session = this.sessionRepo.create({
        sessionId: this.sessionId,
        project,
        workDir,
        platform: 'claude-code',
      })
      logger.info({ sessionId: this.sessionId, project }, 'auto-created session')
    }

    for (const activity of activities) {
      this.storeActivity(activity, session, tokensUsed, messageId)
    }

    this.queueRepo.confirmProcessed(messageId)
    logger.info({ sessionId: this.sessionId, toolName, count: activities.length, tokensUsed }, 'activities extracted')
  }

  private storeActivity(
    activity: ExtractedActivity,
    session: { id: number; sessionId: string; project: string },
    tokensUsed: number,
    _messageId: number,
  ): void {
    this.activityRepo.store({
      sessionDbId: session.id,
      sessionId: session.sessionId,
      project: session.project,
      type: activity.type,
      title: activity.title,
      subtitle: activity.subtitle,
      narrative: activity.narrative,
      facts: JSON.stringify(activity.facts ?? []),
      concepts: JSON.stringify(activity.concepts ?? []),
      filesRead: JSON.stringify(activity.files_read ?? []),
      filesModified: JSON.stringify(activity.files_modified ?? []),
      tokensUsed,
    })
  }

  private async processSummarize(messageId: number): Promise<void> {
    const session = this.sessionRepo.findBySessionId(this.sessionId)
    if (!session) {
      this.queueRepo.confirmProcessed(messageId)
      return
    }

    const activities = this.activityRepo.findBySession(this.sessionId)
    const prompts = this.promptRepo.findBySession(this.sessionId)

    if (activities.length === 0 && prompts.length === 0) {
      this.queueRepo.confirmProcessed(messageId)
      return
    }

    const activitiesJson = JSON.stringify(
      activities.map((a) => ({
        type: a.type,
        title: a.title,
        narrative: a.narrative,
        facts: a.facts,
      })),
      null,
      2,
    )
    const promptsJson = JSON.stringify(
      prompts.map((p) => ({ number: p.promptNumber, text: p.promptText })),
      null,
      2,
    )

    const { summary, tokensUsed } = await this.agent.summarizeSession(activitiesJson, promptsJson)

    if (summary) {
      this.summaryRepo.store({
        sessionDbId: session.id,
        sessionId: session.sessionId,
        project: session.project,
        request: summary.request,
        investigated: summary.investigated,
        insights: summary.insights,
        completed: summary.completed,
        pendingWork: summary.pendingWork ?? '',
        notes: summary.notes ?? '',
        tokensUsed,
      })
      logger.info({ sessionId: this.sessionId, tokensUsed }, 'session summarized')
    }

    this.queueRepo.confirmProcessed(messageId)
  }
}
