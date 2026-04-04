import type { Db } from '../db/database.js'
import { LearningRepository } from '../repositories/LearningRepository.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { ObserverAgent } from '../agent/ObserverAgent.js'
import { AGENT_ENABLED } from '../config.js'
import { logger } from '../lib/logger.js'

export class LearningService {
  private readonly learningRepo: LearningRepository
  private readonly summaryRepo: SummaryRepository
  private readonly activityRepo: ActivityRepository
  private readonly agent: ObserverAgent

  constructor(db: Db) {
    this.learningRepo = new LearningRepository(db)
    this.summaryRepo = new SummaryRepository(db)
    this.activityRepo = new ActivityRepository(db)
    this.agent = new ObserverAgent()
  }

  async extractFromSummary(summaryId: number, sessionId: string): Promise<number> {
    if (!AGENT_ENABLED) return 0

    const summaries = this.summaryRepo.findBySession(sessionId)
    const summary = summaries.find((s) => s.id === summaryId)
    if (!summary) {
      logger.warn({ summaryId, sessionId }, 'summary not found for learning extraction')
      return 0
    }

    const activities = this.activityRepo.findBySession(sessionId)

    const summaryJson = JSON.stringify({
      request: summary.request,
      investigated: summary.investigated,
      insights: summary.insights,
      completed: summary.completed,
      pendingWork: summary.pendingWork,
      notes: summary.notes,
    }, null, 2)

    const activitiesJson = JSON.stringify(
      activities.map((a) => ({
        type: a.type,
        title: a.title,
        narrative: a.narrative,
        concepts: a.concepts,
      })),
      null,
      2,
    )

    const { learnings, tokensUsed } = await this.agent.extractLearnings(summaryJson, activitiesJson)

    if (learnings.length === 0) {
      logger.info({ sessionId, tokensUsed }, 'no learnings extracted from session')
      return 0
    }

    let stored = 0
    for (const learning of learnings) {
      const existing = this.learningRepo.findByKey(learning.key)
      if (existing) {
        this.learningRepo.incrementConfidence(existing.id, learning.pattern, summaryId)
        logger.debug({ key: learning.key, confidence: existing.confidence + 0.8 }, 'learning confidence incremented')
      } else {
        this.learningRepo.store({
          canonicalKey: learning.key,
          category: learning.category,
          pattern: learning.pattern,
          topics: learning.topics,
          sourceSummaryId: summaryId,
        })
        stored++
        logger.debug({ key: learning.key, category: learning.category }, 'new learning stored')
      }
    }

    logger.info({ sessionId, extracted: learnings.length, newLearnings: stored, tokensUsed }, 'learning extraction complete')
    return learnings.length
  }

  getRelevantLearnings(topics: string[], limit = 15) {
    return this.learningRepo.findByTopics(topics, limit)
  }

  decayAll(months = 6): number {
    return this.learningRepo.decayStale(months)
  }

  getStats() {
    return this.learningRepo.getStats()
  }
}
