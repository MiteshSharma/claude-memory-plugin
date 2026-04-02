import type { Db } from './database.js'

// Each migration is versioned and idempotent.
// Add new migrations at the END only — never edit existing ones.
const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   TEXT NOT NULL UNIQUE,
        project      TEXT NOT NULL,
        work_dir     TEXT NOT NULL,
        platform     TEXT NOT NULL DEFAULT 'claude-code',
        status       TEXT NOT NULL DEFAULT 'active'
                     CHECK(status IN ('active','completed','failed')),
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_project    ON sessions(project);

      CREATE TABLE IF NOT EXISTS raw_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_raw_events_session ON raw_events(session_id);

      CREATE TABLE IF NOT EXISTS user_prompts (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        prompt_number     INTEGER NOT NULL DEFAULT 1,
        prompt_text       TEXT NOT NULL,
        created_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_user_prompts_session ON user_prompts(content_session_id);
    `,
  },
]

export function runMigrations(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = db
    .prepare('SELECT version FROM schema_versions')
    .all() as Array<{ version: number }>
  const appliedSet = new Set(applied.map((r) => r.version))

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) continue
    db.exec(migration.sql)
    db.prepare('INSERT INTO schema_versions (version) VALUES (?)').run(migration.version)
    console.log(`[db] applied migration v${migration.version}`)
  }
}
