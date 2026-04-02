import type { Db } from '../db/database.js'
import type { ContextResponse } from '@claude-plugin-kit/shared'

export class ContextService {
  constructor(private readonly db: Db) {}

  async getInjectableContext(project?: string): Promise<ContextResponse> {
    // Phase 1: return empty context — Phase 4 implements memory injection
    console.log(`[context] inject requested for project=${project ?? 'unknown'}`)
    return {
      context: `## Project Memory\n\nNo memory yet for: ${project ?? 'unknown'}\n`,
      project: project ?? 'unknown',
      activityCount: 0,
      sessionCount: 0,
    }
  }

  async getPreview(project?: string): Promise<ContextResponse> {
    return this.getInjectableContext(project)
  }
}
