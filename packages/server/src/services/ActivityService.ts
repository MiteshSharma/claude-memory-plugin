import type { Db } from '../db/database.js'
import type {
  ActivityRequest,
  ActivityResponse,
  SearchQuery,
  SearchResponse,
} from '@claude-plugin-kit/shared'
import { ActivityRepository } from '../repositories/ActivityRepository.js'

export class ActivityService {
  private readonly activityRepo: ActivityRepository

  constructor(db: Db) {
    this.activityRepo = new ActivityRepository(db)
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

    // Phase 1: store raw event — Phase 3 will enqueue to AI agent for compression
    const messageId = this.activityRepo.storeRawEvent({
      sessionId: data.sessionId,
      eventType: data.toolName,
      payload: JSON.stringify({ input: data.toolInput, response: data.toolResponse }),
    })

    return { queued: true, messageId }
  }

  async search(_query: SearchQuery): Promise<SearchResponse> {
    // Phase 1: return empty — Phase 5 implements full vector search
    return { results: [], total: 0, query: _query.query }
  }
}
