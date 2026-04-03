import type { Db } from '../db/database.js'
import type {
  SessionInitRequest,
  SessionInitResponse,
  SessionCompleteResponse,
  SessionPromptRequest,
  SessionPromptResponse,
  SessionTouchResponse,
} from '@memory-updater/shared'
import { SessionRepository } from '../repositories/SessionRepository.js'
import { PromptRepository } from '../repositories/PromptRepository.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { OrphanRecoveryService } from './OrphanRecoveryService.js'
import type { SessionManager } from '../agent/SessionManager.js'

// Sessions idle longer than this are eligible for orphan recovery and will not be resumed
const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export class SessionService {
  private readonly sessionRepo: SessionRepository
  private readonly promptRepo: PromptRepository
  private readonly queueRepo: PendingMessageRepository
  private readonly orphanRecovery: OrphanRecoveryService
  private sessionManager: SessionManager | null = null

  constructor(db: Db) {
    this.sessionRepo = new SessionRepository(db)
    this.promptRepo = new PromptRepository(db)
    this.queueRepo = new PendingMessageRepository(db)
    this.orphanRecovery = new OrphanRecoveryService(db)
  }

  setSessionManager(manager: SessionManager): void {
    this.sessionManager = manager
  }

  async init(data: SessionInitRequest): Promise<SessionInitResponse> {
    // Close sessions that have been idle beyond the timeout before checking for an active one
    await this.orphanRecovery.recoverOrphanedSessions()

    // Find a session for this project/workDir that is still within the 10-min activity window
    const existing = this.sessionRepo.findActiveByProject(data.project, data.workDir, SESSION_TIMEOUT_MS)

    if (existing) {
      // Rebind the session to the current CLI session_id so all subsequent hook
      // calls (which carry input.session_id) resolve to this logical session.
      this.sessionRepo.updateSessionId(existing.id, data.sessionId)
      this.sessionRepo.touchLastActivity(existing.id)

      if (data.userPrompt) {
        const promptNumber = this.promptRepo.countBySessionDbId(existing.id) + 1
        this.promptRepo.save({
          sessionDbId: existing.id,
          contentSessionId: data.sessionId,
          project: data.project,
          promptNumber,
          promptText: data.userPrompt,
        })
      }

      this.sessionRepo.incrementPromptCounter(existing.id)

      console.log(`[session] resumed session db_id=${existing.id} (${existing.sessionId}→${data.sessionId}) project=${data.project}`)
      return {
        sessionDbId: existing.id,
        sessionId: data.sessionId,
        project: data.project,
        status: 'resumed',
      }
    }

    // No active session within window — start a new one
    const session = this.sessionRepo.create({
      sessionId: data.sessionId,
      project: data.project,
      workDir: data.workDir,
      platform: data.platform ?? 'claude-code',
    })

    if (data.userPrompt) {
      this.promptRepo.save({
        sessionDbId: session.id,
        contentSessionId: data.sessionId,
        project: data.project,
        promptNumber: 1,
        promptText: data.userPrompt,
      })
    }

    console.log(`\n──────────────────────────────────────────`)
    console.log(`[SESSION INIT]  id=${session.id}  project=${data.project}`)
    console.log(`  session_id : ${data.sessionId}`)
    console.log(`  workDir    : ${data.workDir}`)
    console.log(`  prompt     : ${data.userPrompt?.slice(0, 100) ?? '(none)'}`)
    console.log(`──────────────────────────────────────────\n`)

    return {
      sessionDbId: session.id,
      sessionId: data.sessionId,
      project: data.project,
      status: 'created',
    }
  }

  async recordPrompt(data: SessionPromptRequest): Promise<SessionPromptResponse> {
    const session = this.sessionRepo.findBySessionId(data.sessionId)
    if (!session) {
      return { saved: false, promptNumber: 0 }
    }

    const promptNumber = this.promptRepo.countBySession(data.sessionId) + 1
    this.promptRepo.save({
      sessionDbId: session.id,
      contentSessionId: data.sessionId,
      project: data.project ?? session.project,
      promptNumber,
      promptText: data.userPrompt,
    })

    this.sessionRepo.incrementPromptCounter(session.id)
    this.sessionRepo.touchLastActivity(session.id)

    console.log(`[session] prompt #${promptNumber} recorded session=${data.sessionId}`)
    return { saved: true, promptNumber }
  }

  async touch(sessionId: string): Promise<SessionTouchResponse> {
    const session = this.sessionRepo.findBySessionId(sessionId)
    if (!session) return { ok: false }
    this.sessionRepo.touchLastActivity(session.id)
    return { ok: true }
  }

  async complete(sessionId: string): Promise<SessionCompleteResponse> {
    this.sessionRepo.markComplete(sessionId)
    console.log(`[session] completed session=${sessionId}`)
    return { completed: true }
  }

  async summarize(sessionId: string): Promise<{ queued: boolean }> {
    const session = this.sessionRepo.findBySessionId(sessionId)
    this.queueRepo.enqueue({
      sessionDbId: session?.id ?? null,
      sessionId,
      messageType: 'summarize',
    })
    this.sessionManager?.enqueue(sessionId)
    console.log(`[session] summarize queued session=${sessionId}`)
    return { queued: true }
  }

  findAll(project?: string, limit = 50) {
    return this.sessionRepo.findAll(project, limit)
  }
}
