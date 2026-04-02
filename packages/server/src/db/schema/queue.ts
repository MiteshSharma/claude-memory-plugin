import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sessions } from './sessions.js'

export const pendingMessages = sqliteTable('pending_messages', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  sessionDbId:  integer('session_db_id').references(() => sessions.id, { onDelete: 'cascade' }),
  sessionId:    text('session_id').notNull(),
  messageType:  text('message_type').notNull(),
  toolName:     text('tool_name'),
  toolInput:    text('tool_input'),
  toolResponse: text('tool_response'),
  workDir:      text('work_dir'),
  promptNumber: integer('prompt_number'),
  status:       text('status').notNull().default('pending'),
  retryCount:   integer('retry_count').notNull().default(0),
  errorMessage: text('error_message'),
  claimedAt:    integer('claimed_at'),
  createdAt:    integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (t) => [
  index('queue_status_idx').on(t.status),
  index('queue_session_idx').on(t.sessionId),
])

export type PendingMessageRow = typeof pendingMessages.$inferSelect
export type PendingMessageInsert = typeof pendingMessages.$inferInsert
