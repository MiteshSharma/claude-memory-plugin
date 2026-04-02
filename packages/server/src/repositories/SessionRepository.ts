import type { Db } from '../db/database.js'

export interface SessionRow {
  id: number
  session_id: string
  project: string
  work_dir: string
  platform: string
  status: 'active' | 'completed' | 'failed'
  created_at: string
  completed_at: string | null
}

export interface CreateSessionData {
  sessionId: string
  project: string
  workDir: string
  platform: string
}

export class SessionRepository {
  constructor(private readonly db: Db) {}

  findBySessionId(sessionId: string): SessionRow | null {
    return (
      (this.db
        .prepare('SELECT * FROM sessions WHERE session_id = ?')
        .get(sessionId) as SessionRow | undefined) ?? null
    )
  }

  create(data: CreateSessionData): SessionRow {
    return this.db
      .prepare(
        `INSERT INTO sessions (session_id, project, work_dir, platform)
         VALUES (?, ?, ?, ?)
         RETURNING *`,
      )
      .get(data.sessionId, data.project, data.workDir, data.platform) as SessionRow
  }

  markComplete(sessionId: string): void {
    this.db
      .prepare(
        `UPDATE sessions
         SET status = 'completed', completed_at = datetime('now')
         WHERE session_id = ?`,
      )
      .run(sessionId)
  }

  findAll(project?: string, limit = 50): SessionRow[] {
    if (project) {
      return this.db
        .prepare(
          'SELECT * FROM sessions WHERE project = ? ORDER BY created_at DESC LIMIT ?',
        )
        .all(project, limit) as SessionRow[]
    }
    return this.db
      .prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?')
      .all(limit) as SessionRow[]
  }

  countAll(): number {
    return (
      this.db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }
    ).c
  }

  findDistinctProjects(): string[] {
    const rows = this.db
      .prepare('SELECT DISTINCT project FROM sessions ORDER BY project ASC')
      .all() as { project: string }[]
    return rows.map((r) => r.project)
  }

  saveUserPrompt(contentSessionId: string, promptNumber: number, promptText: string): void {
    this.db
      .prepare(
        `INSERT INTO user_prompts (content_session_id, prompt_number, prompt_text)
         VALUES (?, ?, ?)`,
      )
      .run(contentSessionId, promptNumber, promptText)
  }

  countUserPrompts(contentSessionId: string): number {
    return (
      this.db
        .prepare(
          'SELECT COUNT(*) as c FROM user_prompts WHERE content_session_id = ?',
        )
        .get(contentSessionId) as { c: number }
    ).c
  }
}
