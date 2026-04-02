import type { RawDb } from './database.js'

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
  {
    version: 2,
    sql: `
      -- sessions: add Phase 2 columns
      ALTER TABLE sessions ADD COLUMN memory_session_id TEXT;
      ALTER TABLE sessions ADD COLUMN prompt_counter INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE sessions ADD COLUMN last_activity_at INTEGER;

      -- activities: AI-processed observations (output of Phase 3 agent)
      CREATE TABLE IF NOT EXISTS activities (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        session_id     TEXT NOT NULL,
        project        TEXT NOT NULL,
        prompt_number  INTEGER,
        type           TEXT NOT NULL,
        title          TEXT NOT NULL,
        subtitle       TEXT,
        narrative      TEXT NOT NULL,
        facts          TEXT NOT NULL DEFAULT '[]',
        concepts       TEXT NOT NULL DEFAULT '[]',
        files_read     TEXT NOT NULL DEFAULT '[]',
        files_modified TEXT NOT NULL DEFAULT '[]',
        tokens_used    INTEGER NOT NULL DEFAULT 0,
        content_hash   TEXT NOT NULL,
        created_at     INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS activity_session_idx ON activities(session_id);
      CREATE INDEX IF NOT EXISTS activity_project_time_idx ON activities(project, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS activity_content_hash_idx ON activities(content_hash);

      -- session_summaries: structured session wrap-ups
      CREATE TABLE IF NOT EXISTS session_summaries (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        session_id     TEXT NOT NULL,
        project        TEXT NOT NULL,
        request        TEXT NOT NULL,
        investigated   TEXT NOT NULL,
        insights       TEXT NOT NULL,
        completed      TEXT NOT NULL,
        pending_work   TEXT NOT NULL DEFAULT '',
        notes          TEXT NOT NULL DEFAULT '',
        tokens_used    INTEGER NOT NULL DEFAULT 0,
        created_at     INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sum_session_idx ON session_summaries(session_id);
      CREATE INDEX IF NOT EXISTS sum_project_time_idx ON session_summaries(project, created_at);

      -- user_prompts: add FK + project
      ALTER TABLE user_prompts ADD COLUMN session_db_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE;
      ALTER TABLE user_prompts ADD COLUMN project TEXT NOT NULL DEFAULT '';

      -- pending_messages: AI processing queue
      CREATE TABLE IF NOT EXISTS pending_messages (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        session_id     TEXT NOT NULL,
        message_type   TEXT NOT NULL,
        tool_name      TEXT,
        tool_input     TEXT,
        tool_response  TEXT,
        work_dir       TEXT,
        prompt_number  INTEGER,
        status         TEXT NOT NULL DEFAULT 'pending',
        retry_count    INTEGER NOT NULL DEFAULT 0,
        error_message  TEXT,
        claimed_at     INTEGER,
        created_at     INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS queue_status_idx ON pending_messages(status);
      CREATE INDEX IF NOT EXISTS queue_session_idx ON pending_messages(session_id);
    `,
  },
]

export function runMigrations(db: RawDb): void {
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
