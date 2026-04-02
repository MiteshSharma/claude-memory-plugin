import type { Db } from '../db/database.js'
import type { ContextResponse } from '@claude-plugin-kit/shared'
import { ContextBuilder, type ContextMode } from '../context/ContextBuilder.js'

export interface TokenEconomics {
  tokensUsed: number
  readTokens: number
  savings: number
  roi: number
  activityCount: number
}

export class ContextService {
  private readonly builder: ContextBuilder

  constructor(db: Db) {
    this.builder = new ContextBuilder(db)
  }

  async getInjectableContext(
    project?: string,
    mode: ContextMode = 'standard',
    debug = false,
  ): Promise<ContextResponse> {
    const projectName = project ?? 'unknown'
    console.log(`[context] inject requested for project=${projectName} mode=${mode}`)

    const result = this.builder.build(projectName, mode, debug)

    return {
      context: result.context,
      project: result.project,
      activityCount: result.activityCount,
      sessionCount: result.sessionCount,
    }
  }

  async getPreview(
    project?: string,
    mode: ContextMode = 'standard',
  ): Promise<ContextResponse> {
    return this.getInjectableContext(project, mode, true)
  }

  async getTokenEconomics(project?: string): Promise<TokenEconomics> {
    const result = this.builder.build(project ?? 'unknown', 'standard', false)
    const savings = result.tokensUsed - result.readTokens
    const roi = result.readTokens > 0
      ? Math.round((result.tokensUsed / result.readTokens) * 10) / 10
      : 0

    return {
      tokensUsed: result.tokensUsed,
      readTokens: result.readTokens,
      savings,
      roi,
      activityCount: result.activityCount,
    }
  }
}
