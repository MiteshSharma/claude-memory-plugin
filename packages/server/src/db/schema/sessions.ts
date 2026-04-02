import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const sessions = sqliteTable('sessions', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  sessionId:       text('session_id').notNull().unique(),
  project:         text('project').notNull(),
  workDir:         text('work_dir').notNull(),
  platform:        text('platform').notNull().default('claude-code'),
  status:          text('status', { enum: ['active', 'completed', 'failed'] }).notNull().default('active'),
  memorySessionId: text('memory_session_id'),
  promptCounter:   integer('prompt_counter').notNull().default(0),
  lastActivityAt:  integer('last_activity_at'),
  createdAt:       text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  completedAt:     text('completed_at'),
}, (t) => [
  index('idx_sessions_project').on(t.project),
])

export type SessionRow = typeof sessions.$inferSelect
export type SessionInsert = typeof sessions.$inferInsert
