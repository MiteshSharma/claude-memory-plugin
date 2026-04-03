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
import { SearchService } from './SearchService.js'
import type { SessionManager } from '../agent/SessionManager.js'
import { logger } from '../lib/logger.js'
import { capPayload } from '../lib/sanitize.js'

export class ActivityService {
  private readonly activityRepo: ActivityRepository
  private readonly queueRepo: PendingMessageRepository
  private readonly sessionRepo: SessionRepository
  private readonly searchService: SearchService
  private sessionManager: SessionManager | null = null

  constructor(db: Db) {
    this.activityRepo = new ActivityRepository(db)
    this.queueRepo = new PendingMessageRepository(db)
    this.sessionRepo = new SessionRepository(db)
    this.searchService = new SearchService(db)
  }

  setSessionManager(manager: SessionManager): void {
    this.sessionManager = manager
  }

  async store(data: ActivityRequest): Promise<ActivityResponse> {
    logger.info(
      { sessionId: data.sessionId, tool: data.toolName, promptNumber: data.promptNumber ?? 'unknown' },
      'activity received',
    )

    // Cap payloads to 10KB (first 5KB + last 5KB) — never log contents (may contain secrets)
    const toolInput = capPayload(JSON.stringify(data.toolInput ?? {}))
    const toolResponse = capPayload(JSON.stringify(data.toolResponse ?? {}))

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
      toolInput,
      toolResponse,
      workDir: data.workDir,
      promptNumber: data.promptNumber,
    })

    // Notify the session processor
    this.sessionManager?.enqueue(data.sessionId)

    return { queued: true, messageId: message.id }
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    return this.searchService.search(query)
  }
}
