import type { Db } from '../db/database.js'
import type {
  SessionInitRequest,
  SessionInitResponse,
  SessionCompleteResponse,
} from '@claude-plugin-kit/shared'
import { SessionRepository } from '../repositories/SessionRepository.js'

export class SessionService {
  private readonly sessionRepo: SessionRepository

  constructor(db: Db) {
    this.sessionRepo = new SessionRepository(db)
  }

  async init(data: SessionInitRequest): Promise<SessionInitResponse> {
    const existing = this.sessionRepo.findBySessionId(data.sessionId)

    if (existing) {
      // Session already tracked — resume it and record this prompt
      if (data.userPrompt) {
        const promptNumber = this.sessionRepo.countUserPrompts(data.sessionId) + 1
        this.sessionRepo.saveUserPrompt(data.sessionId, promptNumber, data.userPrompt)
      }

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
      this.sessionRepo.saveUserPrompt(data.sessionId, 1, data.userPrompt)
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
    // Phase 1: log and ack — Phase 3 will enqueue to AI agent
    console.log(`[session] summarize queued session=${sessionId}`)
    return { queued: true }
  }

  findAll(project?: string, limit = 50) {
    const repo = this.sessionRepo
    return repo.findAll(project, limit)
  }
}
