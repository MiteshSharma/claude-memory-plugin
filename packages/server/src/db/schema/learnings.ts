import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const globalLearnings = sqliteTable('global_learnings', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  canonicalKey:     text('canonical_key').notNull(),
  category:         text('category').notNull(),
  pattern:          text('pattern').notNull(),
  confidence:       real('confidence').notNull().default(1.0),
  evidenceCount:    integer('evidence_count').notNull().default(1),
  topics:           text('topics').notNull().default('[]'),
  sourceSummaryIds: text('source_summary_ids').notNull().default('[]'),
  firstSeenAt:      integer('first_seen_at').notNull().$defaultFn(() => Date.now()),
  lastSeenAt:       integer('last_seen_at').notNull().$defaultFn(() => Date.now()),
  archived:         integer('archived').notNull().default(0),
}, (t) => [
  uniqueIndex('idx_learnings_key').on(t.canonicalKey),
  index('idx_learnings_category').on(t.category),
  index('idx_learnings_confidence').on(t.confidence),
  index('idx_learnings_last_seen').on(t.lastSeenAt),
])

export type LearningRow = typeof globalLearnings.$inferSelect
export type LearningInsert = typeof globalLearnings.$inferInsert
