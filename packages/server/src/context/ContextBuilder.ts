import type { Db } from '../db/database.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { SessionRepository } from '../repositories/SessionRepository.js'
import type { ActivityRow } from '../db/schema/index.js'
import type { SummaryRow } from '../db/schema/index.js'

export type ContextMode = 'minimal' | 'standard' | 'full'

interface ContextResult {
  context: string
  project: string
  activityCount: number
  sessionCount: number
  tokensUsed: number
  readTokens: number
}

const ACTIVITY_LIMITS: Record<ContextMode, number> = {
  minimal: 0,
  standard: 50,
  full: 200,
}

const SUMMARY_LIMIT = 3

export class ContextBuilder {
  private readonly activityRepo: ActivityRepository
  private readonly summaryRepo: SummaryRepository
  private readonly sessionRepo: SessionRepository

  constructor(db: Db) {
    this.activityRepo = new ActivityRepository(db)
    this.summaryRepo = new SummaryRepository(db)
    this.sessionRepo = new SessionRepository(db)
  }

  build(project: string, mode: ContextMode = 'standard', debug = false): ContextResult {
    const summaries = this.summaryRepo.findRecent(project, SUMMARY_LIMIT)
    const activityLimit = ACTIVITY_LIMITS[mode]
    const activities = activityLimit > 0
      ? this.activityRepo.findRecent(project, activityLimit)
      : []
    const sessionCount = this.sessionRepo.findAll(project, 1000).length

    const totalTokensUsed = [
      ...activities.map((a) => a.tokensUsed),
      ...summaries.map((s) => s.tokensUsed),
    ].reduce((sum, t) => sum + t, 0)

    const sections: string[] = []

    // Header
    sections.push(this.renderHeader(project, activities.length, sessionCount))

    // Previously (session summaries)
    if (summaries.length > 0) {
      sections.push(this.renderPreviously(summaries))
    }

    // Most recent session summary (full detail)
    const latest = summaries[0]
    if (latest && mode !== 'minimal') {
      sections.push(this.renderLatestSummary(latest))
    }

    // Timeline (activities)
    if (activities.length > 0 && mode !== 'minimal') {
      sections.push(this.renderTimeline(activities))
    }

    const context = sections.join('\n\n')
    const readTokens = Math.ceil(context.length / 3.2)

    // Footer with token economics
    if (mode !== 'minimal' && totalTokensUsed > 0) {
      const roi = readTokens > 0 ? Math.round(totalTokensUsed / readTokens * 10) / 10 : 0
      sections.push(
        `---\n*${activities.length} activities · ~${readTokens} read tokens · ${roi}x ROI*`,
      )
    }

    const finalContext = sections.join('\n\n')
    const finalReadTokens = Math.ceil(finalContext.length / 3.2)

    const debugComment = debug
      ? `\n<!-- context-debug: ${finalReadTokens} tokens, ${activities.length} activities, ${summaries.length} summaries, mode=${mode} -->\n`
      : ''

    return {
      context: finalContext + debugComment,
      project,
      activityCount: activities.length,
      sessionCount,
      tokensUsed: totalTokensUsed,
      readTokens: finalReadTokens,
    }
  }

  private renderHeader(project: string, activityCount: number, sessionCount: number): string {
    return `## ${project} — Project Memory\n\n${activityCount} activities across ${sessionCount} sessions`
  }

  private renderPreviously(summaries: SummaryRow[]): string {
    const lines = ['### Previously']
    for (const s of summaries) {
      const date = new Date(s.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      lines.push(`- **${date}**: ${s.request} → ${s.completed}`)
    }
    return lines.join('\n')
  }

  private renderLatestSummary(summary: SummaryRow): string {
    const lines = ['### Latest Session']
    lines.push(`**Request**: ${summary.request}`)
    lines.push(`**Investigated**: ${summary.investigated}`)
    if (summary.insights) lines.push(`**Insights**: ${summary.insights}`)
    lines.push(`**Completed**: ${summary.completed}`)
    if (summary.pendingWork) lines.push(`**Pending**: ${summary.pendingWork}`)
    if (summary.notes) lines.push(`**Notes**: ${summary.notes}`)
    return lines.join('\n')
  }

  private renderTimeline(activities: ActivityRow[]): string {
    const lines = ['### Recent Activity']

    // Group by date
    const byDate = new Map<string, ActivityRow[]>()
    for (const a of activities) {
      const date = new Date(a.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const group = byDate.get(date) ?? []
      group.push(a)
      byDate.set(date, group)
    }

    for (const [date, group] of byDate) {
      lines.push(`\n**${date}**`)
      for (const a of group) {
        const badge = a.type ? `[${a.type}]` : ''
        lines.push(`- ${badge} ${a.title}`)
        if (a.narrative) lines.push(`  ${a.narrative}`)
      }
    }

    return lines.join('\n')
  }
}
