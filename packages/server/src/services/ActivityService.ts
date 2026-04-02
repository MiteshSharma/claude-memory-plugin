import type { Db } from '../db/database.js'
import type {
  ActivityRequest,
  ActivityResponse,
  SearchQuery,
  SearchResponse,
} from '@claude-plugin-kit/shared'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { SessionRepository } from '../repositories/SessionRepository.js'
import type { SessionManager } from '../agent/SessionManager.js'

export class ActivityService {
  private readonly activityRepo: ActivityRepository
  private readonly queueRepo: PendingMessageRepository
  private readonly sessionRepo: SessionRepository
  private sessionManager: SessionManager | null = null

  constructor(db: Db) {
    this.activityRepo = new ActivityRepository(db)
    this.queueRepo = new PendingMessageRepository(db)
    this.sessionRepo = new SessionRepository(db)
  }

  setSessionManager(manager: SessionManager): void {
    this.sessionManager = manager
  }

  async store(data: ActivityRequest): Promise<ActivityResponse> {
    const inputPreview = JSON.stringify(data.toolInput ?? {}).slice(0, 200)
    const outputPreview = JSON.stringify(data.toolResponse ?? {}).slice(0, 200)

    console.log(`\n══════════════════════════════════════════`)
    console.log(`[ACTIVITY]  session=${data.sessionId}  tool=${data.toolName}`)
    console.log(`  workDir     : ${data.workDir}`)
    console.log(`  prompt_num  : ${data.promptNumber ?? 'unknown'}`)
    console.log(`  tool_input  : ${inputPreview}`)
    console.log(`  tool_output : ${outputPreview}`)
    console.log(`══════════════════════════════════════════\n`)

    // Store raw event (Phase 1 intake buffer)
    this.activityRepo.storeRawEvent({
      sessionId: data.sessionId,
      eventType: data.toolName,
      payload: JSON.stringify({ input: data.toolInput, response: data.toolResponse }),
    })

    // Enqueue for AI processing
    const session = this.sessionRepo.findBySessionId(data.sessionId)
    const message = this.queueRepo.enqueue({
      sessionDbId: session?.id ?? null,
      sessionId: data.sessionId,
      messageType: 'tool_use',
      toolName: data.toolName,
      toolInput: JSON.stringify(data.toolInput ?? {}),
      toolResponse: JSON.stringify(data.toolResponse ?? {}),
      workDir: data.workDir,
      promptNumber: data.promptNumber,
    })

    // Notify the session processor
    this.sessionManager?.enqueue(data.sessionId)

    return { queued: true, messageId: message.id }
  }

  async search(_query: SearchQuery): Promise<SearchResponse> {
    // Phase 5 implements full vector search
    return { results: [], total: 0, query: _query.query }
  }
}
