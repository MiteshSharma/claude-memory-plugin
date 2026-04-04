import { eq, and, lt, or, isNull, gt, desc, sql, count } from 'drizzle-orm'
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
        lastActivityAt: Date.now(),
      })
      .returning()
      .get()
  }

  // Find the single active session for a project/workDir within the inactivity window.
  // Returns undefined if no session is active or all are idle beyond timeoutMs.
  findActiveByProject(project: string, workDir: string, timeoutMs: number): SessionRow | undefined {
    const cutoff = Date.now() - timeoutMs
    return this.db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.project, project),
        eq(sessions.workDir, workDir),
        eq(sessions.status, 'active'),
        gt(sessions.lastActivityAt, cutoff),
      ))
      .orderBy(desc(sessions.lastActivityAt))
      .get()
  }

  // Rebind the session to a new CLI session ID so all subsequent hook calls
  // that carry the new session_id resolve to this logical session.
  updateSessionId(id: number, newSessionId: string): void {
    this.db
      .update(sessions)
      .set({ sessionId: newSessionId })
      .where(eq(sessions.id, id))
      .run()
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

  findOrphaned(thresholdMs: number): SessionRow[] {
    const cutoff = Date.now() - thresholdMs
    return this.db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.status, 'active'),
        or(
          lt(sessions.lastActivityAt, cutoff),
          isNull(sessions.lastActivityAt),
        ),
      ))
      .all()
  }

  /** Delete completed/failed sessions older than N days. Returns count deleted. */
  deleteOlderThan(days: number): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    // createdAt is TEXT (ISO 8601) — compare as string
    const result = this.db
      .delete(sessions)
      .where(and(
        or(eq(sessions.status, 'completed'), eq(sessions.status, 'failed')),
        lt(sessions.createdAt, new Date(cutoff).toISOString()),
      ))
      .returning({ id: sessions.id })
      .all()
    return result.length
  }

  touchLastActivity(id: number): void {
    this.db
      .update(sessions)
      .set({ lastActivityAt: Date.now() })
      .where(eq(sessions.id, id))
      .run()
  }
}
