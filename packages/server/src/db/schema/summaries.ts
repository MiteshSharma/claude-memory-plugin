import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sessions } from './sessions.js'

export const sessionSummaries = sqliteTable('session_summaries', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  sessionDbId:  integer('session_db_id').references(() => sessions.id, { onDelete: 'cascade' }),
  sessionId:    text('session_id').notNull(),
  project:      text('project').notNull(),
  request:      text('request').notNull(),
  investigated: text('investigated').notNull(),
  insights:     text('insights').notNull(),
  completed:    text('completed').notNull(),
  pendingWork:  text('pending_work').notNull().default(''),
  notes:        text('notes').notNull().default(''),
  tokensUsed:   integer('tokens_used').notNull().default(0),
  createdAt:    integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (t) => [
  index('sum_session_idx').on(t.sessionId),
  index('sum_project_time_idx').on(t.project, t.createdAt),
])

export type SummaryRow = typeof sessionSummaries.$inferSelect
export type SummaryInsert = typeof sessionSummaries.$inferInsert
