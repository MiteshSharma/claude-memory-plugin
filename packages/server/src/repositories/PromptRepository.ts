import { eq, desc, count, asc, and } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import { userPrompts, type PromptRow } from '../db/schema/index.js'

export type { PromptRow }

export class PromptRepository {
  constructor(private readonly db: Db) {}

  save(data: {
    sessionDbId?: number | null
    contentSessionId: string
    project: string
    promptNumber: number
    promptText: string
  }): PromptRow {
    return this.db
      .insert(userPrompts)
      .values({
        sessionDbId: data.sessionDbId,
        contentSessionId: data.contentSessionId,
        project: data.project,
        promptNumber: data.promptNumber,
        promptText: data.promptText,
      })
      .returning()
      .get()
  }

  findBySession(sessionId: string): PromptRow[] {
    return this.db
      .select()
      .from(userPrompts)
      .where(eq(userPrompts.contentSessionId, sessionId))
      .orderBy(asc(userPrompts.promptNumber))
      .all()
  }

  getLatest(sessionId: string): PromptRow | undefined {
    return this.db
      .select()
      .from(userPrompts)
      .where(eq(userPrompts.contentSessionId, sessionId))
      .orderBy(desc(userPrompts.promptNumber))
      .limit(1)
      .get()
  }

  countBySession(sessionId: string): number {
    const result = this.db
      .select({ value: count() })
      .from(userPrompts)
      .where(eq(userPrompts.contentSessionId, sessionId))
      .get()
    return result?.value ?? 0
  }

  listRecent(opts: { project?: string | undefined; sessionId?: string | undefined; limit?: number | undefined; offset?: number | undefined }): { prompts: PromptRow[]; total: number } {
    const limit = opts.limit ?? 50
    const offset = opts.offset ?? 0

    const conditions = [
      opts.project ? eq(userPrompts.project, opts.project) : undefined,
      opts.sessionId ? eq(userPrompts.contentSessionId, opts.sessionId) : undefined,
    ].filter(Boolean)

    const where = conditions.length > 1
      ? and(...(conditions as Parameters<typeof and>))
      : conditions[0]

    const total = this.db
      .select({ value: count() })
      .from(userPrompts)
      .where(where)
      .get()?.value ?? 0

    const prompts = this.db
      .select()
      .from(userPrompts)
      .where(where)
      .orderBy(desc(userPrompts.id))
      .limit(limit)
      .offset(offset)
      .all()

    return { prompts, total }
  }

  countBySessionDbId(sessionDbId: number): number {
    const result = this.db
      .select({ value: count() })
      .from(userPrompts)
      .where(eq(userPrompts.sessionDbId, sessionDbId))
      .get()
    return result?.value ?? 0
  }
}
