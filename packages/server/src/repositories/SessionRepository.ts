import { eq, desc, sql, count } from 'drizzle-orm'
import type { Db } from '../db/database.js'
import { sessions, type SessionRow } from '../db/schema/index.js'

export type { SessionRow }

export interface CreateSessionData {
  sessionId: string
  project: string
  workDir: string
  platform: string
}

export class SessionRepository {
  constructor(private readonly db: Db) {}

  findBySessionId(sessionId: string): SessionRow | undefined {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .get()
  }

  create(data: CreateSessionData): SessionRow {
    return this.db
      .insert(sessions)
      .values({
        sessionId: data.sessionId,
        project: data.project,
        workDir: data.workDir,
        platform: data.platform,
      })
      .returning()
      .get()
  }

  markComplete(sessionId: string): void {
    this.db
      .update(sessions)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
      })
      .where(eq(sessions.sessionId, sessionId))
      .run()
  }

  findAll(project?: string, limit = 50): SessionRow[] {
    const query = this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(limit)

    if (project) {
      return query.where(eq(sessions.project, project)).all()
    }
    return query.all()
  }

  countAll(): number {
    const result = this.db
      .select({ value: count() })
      .from(sessions)
      .get()
    return result?.value ?? 0
  }

  findDistinctProjects(): string[] {
    const rows = this.db
      .selectDistinct({ project: sessions.project })
      .from(sessions)
      .orderBy(sessions.project)
      .all()
    return rows.map((r) => r.project)
  }

  findWithStatus(status: 'active' | 'completed' | 'failed'): SessionRow[] {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.status, status))
      .all()
  }

  incrementPromptCounter(id: number): number {
    const result = this.db
      .update(sessions)
      .set({ promptCounter: sql`prompt_counter + 1` })
      .where(eq(sessions.id, id))
      .returning({ promptCounter: sessions.promptCounter })
      .get()
    return result?.promptCounter ?? 0
  }

  setMemorySessionId(id: number, memorySessionId: string): void {
    this.db
      .update(sessions)
      .set({ memorySessionId })
      .where(eq(sessions.id, id))
      .run()
  }

  touchLastActivity(id: number): void {
    this.db
      .update(sessions)
      .set({ lastActivityAt: Date.now() })
      .where(eq(sessions.id, id))
      .run()
  }
}
