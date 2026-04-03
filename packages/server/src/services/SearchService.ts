import type { Db } from '../db/database.js'
import type { SearchQuery, SearchResponse } from '@claude-plugin-kit/shared'
import { SearchRepository, type SearchResult } from '../repositories/SearchRepository.js'
import type { ActivityRow } from '../db/schema/index.js'

export class SearchService {
  private readonly searchRepo: SearchRepository

  constructor(db: Db) {
    this.searchRepo = new SearchRepository(db)
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const opts = {
      query: query.query,
      project: query.project,
      limit: query.limit ?? 20,
    }

    let results: SearchResult[] = []

    switch (query.type) {
      case 'activities':
        results = this.searchRepo.searchActivities(opts)
        break
      case 'sessions':
        results = this.searchRepo.searchSummaries(opts)
        break
      case 'prompts':
        results = this.searchRepo.searchPrompts(opts)
        break
      case 'all':
      default: {
        const limit = Math.ceil((opts.limit) / 3)
        const activityResults = this.searchRepo.searchActivities({ ...opts, limit })
        const summaryResults = this.searchRepo.searchSummaries({ ...opts, limit })
        const promptResults = this.searchRepo.searchPrompts({ ...opts, limit })
        results = [...activityResults, ...summaryResults, ...promptResults]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, opts.limit)
        break
      }
    }

    return {
      results,
      total: results.length,
      query: query.query,
    }
  }

  getActivitiesByIds(ids: number[]): ActivityRow[] {
    return this.searchRepo.getActivitiesByIds(ids)
  }

  getTimeline(anchorId: number, depthBefore = 5, depthAfter = 5): ActivityRow[] {
    return this.searchRepo.getTimeline(anchorId, depthBefore, depthAfter)
  }

  findTimelineByQuery(
    query: string,
    project?: string,
    depthBefore = 5,
    depthAfter = 5,
  ): ActivityRow[] {
    // Find the best matching activity and use it as anchor
    const results = this.searchRepo.searchActivities({
      query,
      project,
      limit: 1,
    })

    const first = results[0]
    if (!first) return []

    return this.searchRepo.getTimeline(first.id, depthBefore, depthAfter)
  }
}
