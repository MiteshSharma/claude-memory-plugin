import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sessions } from './sessions.js'

export const userPrompts = sqliteTable('user_prompts', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  sessionDbId:      integer('session_db_id').references(() => sessions.id, { onDelete: 'cascade' }),
  contentSessionId: text('content_session_id').notNull(),
  project:          text('project').notNull().default(''),
  promptNumber:     integer('prompt_number').notNull(),
  promptText:       text('prompt_text').notNull(),
  createdAt:        text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => [
  index('idx_user_prompts_session').on(t.contentSessionId),
])

export type PromptRow = typeof userPrompts.$inferSelect
export type PromptInsert = typeof userPrompts.$inferInsert
