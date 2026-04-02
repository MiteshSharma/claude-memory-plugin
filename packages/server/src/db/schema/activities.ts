import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sessions } from './sessions.js'

export const activities = sqliteTable('activities', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  sessionDbId:   integer('session_db_id').references(() => sessions.id, { onDelete: 'cascade' }),
  sessionId:     text('session_id').notNull(),
  project:       text('project').notNull(),
  promptNumber:  integer('prompt_number'),
  type:          text('type').notNull(),
  title:         text('title').notNull(),
  subtitle:      text('subtitle'),
  narrative:     text('narrative').notNull(),
  facts:         text('facts').notNull().default('[]'),
  concepts:      text('concepts').notNull().default('[]'),
  filesRead:     text('files_read').notNull().default('[]'),
  filesModified: text('files_modified').notNull().default('[]'),
  tokensUsed:    integer('tokens_used').notNull().default(0),
  contentHash:   text('content_hash').notNull(),
  createdAt:     integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (t) => [
  index('activity_session_idx').on(t.sessionId),
  index('activity_project_time_idx').on(t.project, t.createdAt),
  uniqueIndex('activity_content_hash_idx').on(t.contentHash),
])

export type ActivityRow = typeof activities.$inferSelect
export type ActivityInsert = typeof activities.$inferInsert
