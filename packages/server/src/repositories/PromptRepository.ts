import { eq, desc, count, asc } from 'drizzle-orm'
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
}
