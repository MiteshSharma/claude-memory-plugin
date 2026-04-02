import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const rawEvents = sqliteTable('raw_events', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  eventType: text('event_type').notNull(),
  payload:   text('payload').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => [
  index('idx_raw_events_session').on(t.sessionId),
])

export type RawEventRow = typeof rawEvents.$inferSelect
export type RawEventInsert = typeof rawEvents.$inferInsert
