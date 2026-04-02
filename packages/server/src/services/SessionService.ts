import type { Db } from '../db/database.js'
import type {
  SessionInitRequest,
  SessionInitResponse,
  SessionCompleteResponse,
} from '@claude-plugin-kit/shared'
import { SessionRepository } from '../repositories/SessionRepository.js'
import { PromptRepository } from '../repositories/PromptRepository.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { OrphanRecoveryService } from './OrphanRecoveryService.js'
import type { SessionManager } from '../agent/SessionManager.js'

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
    // Recover orphaned sessions before creating/resuming
    await this.orphanRecovery.recoverOrphanedSessions()

    const existing = this.sessionRepo.findBySessionId(data.sessionId)

    if (existing) {
      if (data.userPrompt) {
        const promptNumber = this.promptRepo.countBySession(data.sessionId) + 1
        this.promptRepo.save({
          sessionDbId: existing.id,
          contentSessionId: data.sessionId,
          project: data.project,
          promptNumber,
          promptText: data.userPrompt,
        })
      }

      this.sessionRepo.incrementPromptCounter(existing.id)
      this.sessionRepo.touchLastActivity(existing.id)

      console.log(`[session] resumed session=${data.sessionId} project=${data.project}`)
      return {
        sessionDbId: existing.id,
        sessionId: data.sessionId,
        project: data.project,
        status: 'resumed',
      }
    }

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
