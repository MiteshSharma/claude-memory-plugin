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
  {
    version: 3,
    sql: `
      -- FTS5 virtual tables for full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS activities_fts USING fts5(
        title, subtitle, narrative, facts, concepts,
        content='activities', content_rowid='id'
      );

      -- Auto-sync triggers for activities_fts
      CREATE TRIGGER IF NOT EXISTS activities_fts_insert AFTER INSERT ON activities BEGIN
        INSERT INTO activities_fts(rowid, title, subtitle, narrative, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.facts, new.concepts);
      END;
      CREATE TRIGGER IF NOT EXISTS activities_fts_delete AFTER DELETE ON activities BEGIN
        INSERT INTO activities_fts(activities_fts, rowid, title, subtitle, narrative, facts, concepts)
        VALUES ('delete', old.id, old.title, old.subtitle, old.narrative, old.facts, old.concepts);
      END;
      CREATE TRIGGER IF NOT EXISTS activities_fts_update AFTER UPDATE ON activities BEGIN
        INSERT INTO activities_fts(activities_fts, rowid, title, subtitle, narrative, facts, concepts)
        VALUES ('delete', old.id, old.title, old.subtitle, old.narrative, old.facts, old.concepts);
        INSERT INTO activities_fts(rowid, title, subtitle, narrative, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.facts, new.concepts);
      END;

      CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
        request, investigated, insights, completed, pending_work, notes,
        content='session_summaries', content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS summaries_fts_insert AFTER INSERT ON session_summaries BEGIN
        INSERT INTO summaries_fts(rowid, request, investigated, insights, completed, pending_work, notes)
        VALUES (new.id, new.request, new.investigated, new.insights, new.completed, new.pending_work, new.notes);
      END;
      CREATE TRIGGER IF NOT EXISTS summaries_fts_delete AFTER DELETE ON session_summaries BEGIN
        INSERT INTO summaries_fts(summaries_fts, rowid, request, investigated, insights, completed, pending_work, notes)
        VALUES ('delete', old.id, old.request, old.investigated, old.insights, old.completed, old.pending_work, old.notes);
      END;
      CREATE TRIGGER IF NOT EXISTS summaries_fts_update AFTER UPDATE ON session_summaries BEGIN
        INSERT INTO summaries_fts(summaries_fts, rowid, request, investigated, insights, completed, pending_work, notes)
        VALUES ('delete', old.id, old.request, old.investigated, old.insights, old.completed, old.pending_work, old.notes);
        INSERT INTO summaries_fts(rowid, request, investigated, insights, completed, pending_work, notes)
        VALUES (new.id, new.request, new.investigated, new.insights, new.completed, new.pending_work, new.notes);
      END;

      CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
        prompt_text,
        content='user_prompts', content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS prompts_fts_insert AFTER INSERT ON user_prompts BEGIN
        INSERT INTO prompts_fts(rowid, prompt_text) VALUES (new.id, new.prompt_text);
      END;
      CREATE TRIGGER IF NOT EXISTS prompts_fts_delete AFTER DELETE ON user_prompts BEGIN
        INSERT INTO prompts_fts(prompts_fts, rowid, prompt_text)
        VALUES ('delete', old.id, old.prompt_text);
      END;
      CREATE TRIGGER IF NOT EXISTS prompts_fts_update AFTER UPDATE ON user_prompts BEGIN
        INSERT INTO prompts_fts(prompts_fts, rowid, prompt_text)
        VALUES ('delete', old.id, old.prompt_text);
        INSERT INTO prompts_fts(rowid, prompt_text) VALUES (new.id, new.prompt_text);
      END;
    `,
  },
  {
    version: 4,
    sql: `
      -- Phase 10: Global learnings table
      CREATE TABLE IF NOT EXISTS global_learnings (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_key     TEXT NOT NULL UNIQUE,
        category          TEXT NOT NULL CHECK(category IN ('coding','tooling','architecture','debugging','review','workflow')),
        pattern           TEXT NOT NULL,
        confidence        REAL NOT NULL DEFAULT 1.0,
        evidence_count    INTEGER NOT NULL DEFAULT 1,
        topics            TEXT NOT NULL DEFAULT '[]',
        source_summary_ids TEXT NOT NULL DEFAULT '[]',
        first_seen_at     INTEGER NOT NULL,
        last_seen_at      INTEGER NOT NULL,
        archived          INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_learnings_key ON global_learnings(canonical_key);
      CREATE INDEX IF NOT EXISTS idx_learnings_category ON global_learnings(category);
      CREATE INDEX IF NOT EXISTS idx_learnings_confidence ON global_learnings(confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_learnings_last_seen ON global_learnings(last_seen_at);

      -- FTS5 for learnings search
      CREATE VIRTUAL TABLE IF NOT EXISTS learnings_fts USING fts5(
        pattern, topics, canonical_key,
        content='global_learnings', content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS learnings_fts_insert AFTER INSERT ON global_learnings BEGIN
        INSERT INTO learnings_fts(rowid, pattern, topics, canonical_key)
        VALUES (new.id, new.pattern, new.topics, new.canonical_key);
      END;
      CREATE TRIGGER IF NOT EXISTS learnings_fts_delete AFTER DELETE ON global_learnings BEGIN
        INSERT INTO learnings_fts(learnings_fts, rowid, pattern, topics, canonical_key)
        VALUES ('delete', old.id, old.pattern, old.topics, old.canonical_key);
      END;
      CREATE TRIGGER IF NOT EXISTS learnings_fts_update AFTER UPDATE ON global_learnings BEGIN
        INSERT INTO learnings_fts(learnings_fts, rowid, pattern, topics, canonical_key)
        VALUES ('delete', old.id, old.pattern, old.topics, old.canonical_key);
        INSERT INTO learnings_fts(rowid, pattern, topics, canonical_key)
        VALUES (new.id, new.pattern, new.topics, new.canonical_key);
      END;
    `,
  },
  {
    version: 5,
    sql: `
      -- Phase 11: Retention policy support
      ALTER TABLE session_summaries ADD COLUMN processed_for_learnings INTEGER NOT NULL DEFAULT 0;
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
