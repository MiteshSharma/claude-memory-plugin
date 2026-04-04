import { z } from 'zod'

// ─── Shared / Error ───────────────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Machine-readable error code'),
  details: z.unknown().optional().describe('Validation error details'),
})
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// ─── Health ───────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']).describe('Server status'),
  version: z.string().describe('Plugin version'),
  uptime: z.number().describe('Server uptime in seconds'),
  pid: z.number().describe('Server process ID'),
  db: z.boolean().describe('Database connectivity'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
})
export type HealthResponse = z.infer<typeof HealthResponseSchema>

export const StatsResponseSchema = z.object({
  sessions: z.number().describe('Total sessions stored'),
  activities: z.number().describe('Total AI-processed activities'),
  rawEvents: z.number().describe('Total raw events captured'),
  uptime: z.number().describe('Server uptime in seconds'),
})
export type StatsResponse = z.infer<typeof StatsResponseSchema>

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const SessionInitRequestSchema = z.object({
  sessionId: z.string().min(1).describe('Claude Code content session ID'),
  project: z.string().min(1).describe('Project name derived from working directory'),
  workDir: z.string().min(1).describe('Current working directory'),
  userPrompt: z.string().optional().describe('First user message of the session'),
  platform: z.string().default('claude-code').describe('Platform identifier'),
})
export type SessionInitRequest = z.infer<typeof SessionInitRequestSchema>

export const SessionInitResponseSchema = z.object({
  sessionDbId: z.number().describe('Internal database ID for this session'),
  sessionId: z.string().describe('Echo of the provided session ID'),
  project: z.string().describe('Project name'),
  status: z.enum(['created', 'resumed']).describe('Whether session was new or resumed'),
})
export type SessionInitResponse = z.infer<typeof SessionInitResponseSchema>

export const SessionCompleteRequestSchema = z.object({
  sessionId: z.string().min(1).describe('Session ID to mark complete'),
})
export type SessionCompleteRequest = z.infer<typeof SessionCompleteRequestSchema>

export const SessionCompleteResponseSchema = z.object({
  completed: z.boolean(),
})
export type SessionCompleteResponse = z.infer<typeof SessionCompleteResponseSchema>

export const SessionSchema = z.object({
  id: z.number(),
  sessionId: z.string(),
  project: z.string(),
  workDir: z.string(),
  platform: z.string(),
  status: z.enum(['active', 'completed', 'failed']),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
})
export type Session = z.infer<typeof SessionSchema>

export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionSchema),
  total: z.number(),
})
export type SessionsListResponse = z.infer<typeof SessionsListResponseSchema>

export const SessionSummarySchema = z.object({
  id: z.number(),
  request: z.string(),
  investigated: z.string(),
  insights: z.string(),
  completed: z.string(),
  pendingWork: z.string(),
  notes: z.string(),
  tokensUsed: z.number(),
  createdAt: z.number(),
})
export type SessionSummary = z.infer<typeof SessionSummarySchema>

export const SessionWithSummarySchema = SessionSchema.extend({
  promptCounter: z.number(),
  summary: SessionSummarySchema.nullable(),
})
export type SessionWithSummary = z.infer<typeof SessionWithSummarySchema>

export const SessionsWithSummaryResponseSchema = z.object({
  sessions: z.array(SessionWithSummarySchema),
  total: z.number(),
})
export type SessionsWithSummaryResponse = z.infer<typeof SessionsWithSummaryResponseSchema>

// ─── Timeline ─────────────────────────────────────────────────────────────────

export const TimelinePromptItemSchema = z.object({
  kind: z.literal('prompt'),
  id: z.number(),
  promptNumber: z.number(),
  promptText: z.string(),
  createdAt: z.string(),
})
export type TimelinePromptItem = z.infer<typeof TimelinePromptItemSchema>

export const TimelineActivityItemSchema = z.object({
  kind: z.literal('activity'),
  id: z.number(),
  promptNumber: z.number().nullable(),
  type: z.string(),
  title: z.string(),
  narrative: z.string(),
  facts: z.string(),
  concepts: z.string(),
  filesRead: z.string(),
  filesModified: z.string(),
  createdAt: z.number(),
})
export type TimelineActivityItem = z.infer<typeof TimelineActivityItemSchema>

export const TimelineItemSchema = z.discriminatedUnion('kind', [
  TimelinePromptItemSchema,
  TimelineActivityItemSchema,
])
export type TimelineItem = z.infer<typeof TimelineItemSchema>

export const TimelineResponseSchema = z.object({
  items: z.array(TimelineItemSchema),
  sessionId: z.string(),
  promptCount: z.number(),
  activityCount: z.number(),
})
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>

// ─── Patterns ─────────────────────────────────────────────────────────────────

export const PatternItemSchema = z.object({
  value: z.string(),
  count: z.number(),
})
export type PatternItem = z.infer<typeof PatternItemSchema>

export const PatternsQuerySchema = z.object({
  project: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
})
export type PatternsQuery = z.infer<typeof PatternsQuerySchema>

export const PatternsResponseSchema = z.object({
  topFiles: z.array(PatternItemSchema),
  topConcepts: z.array(PatternItemSchema),
  project: z.string().nullable(),
})
export type PatternsResponse = z.infer<typeof PatternsResponseSchema>

// ─── Activities ──────────────────────────────────────────────────────────────

export const ActivityRequestSchema = z.object({
  sessionId: z.string().min(1).describe('Session this activity belongs to'),
  toolName: z.string().min(1).describe('Name of the tool Claude executed'),
  toolInput: z.unknown().optional().describe('Tool input payload (JSON)'),
  toolResponse: z.unknown().optional().describe('Tool response payload (JSON)'),
  workDir: z.string().min(1).describe('Working directory when tool was called'),
  promptNumber: z.number().int().optional().describe('Which prompt in the session (1-based)'),
})
export type ActivityRequest = z.infer<typeof ActivityRequestSchema>

export const ActivityResponseSchema = z.object({
  queued: z.boolean().describe('Whether the activity was accepted for processing'),
  messageId: z.number().optional().describe('Internal queue message ID'),
})
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>

// ─── Summarize ────────────────────────────────────────────────────────────────

export const SessionPromptRequestSchema = z.object({
  sessionId: z.string().min(1).describe('Session ID to record the prompt for'),
  userPrompt: z.string().min(1).describe('User prompt text'),
  workDir: z.string().min(1).describe('Current working directory'),
  project: z.string().optional().describe('Project name (derived from workDir if omitted)'),
})
export type SessionPromptRequest = z.infer<typeof SessionPromptRequestSchema>

export const SessionPromptResponseSchema = z.object({
  saved: z.boolean(),
  promptNumber: z.number(),
})
export type SessionPromptResponse = z.infer<typeof SessionPromptResponseSchema>

export const SessionTouchRequestSchema = z.object({
  sessionId: z.string().min(1).describe('Session ID to touch'),
})
export type SessionTouchRequest = z.infer<typeof SessionTouchRequestSchema>

export const SessionTouchResponseSchema = z.object({
  ok: z.boolean(),
})
export type SessionTouchResponse = z.infer<typeof SessionTouchResponseSchema>

export const SummarizeRequestSchema = z.object({
  sessionId: z.string().min(1).describe('Session to summarize'),
  workDir: z.string().min(1).describe('Working directory'),
})
export type SummarizeRequest = z.infer<typeof SummarizeRequestSchema>

export const SummarizeResponseSchema = z.object({
  queued: z.boolean().describe('Whether summarization was queued'),
})
export type SummarizeResponse = z.infer<typeof SummarizeResponseSchema>

// ─── Context ──────────────────────────────────────────────────────────────────

export const ContextQuerySchema = z.object({
  project: z.string().optional().describe('Project name to get context for'),
  mode: z.enum(['minimal', 'standard', 'full']).optional().default('standard').describe('Context mode'),
  debug: z.coerce.boolean().optional().default(false).describe('Add debug info to output'),
  workDir: z.string().optional().describe('Working directory for tech stack detection'),
})
export type ContextQuery = z.infer<typeof ContextQuerySchema>

export const ContextResponseSchema = z.object({
  context: z.string().describe('Markdown-formatted memory context for injection'),
  project: z.string().describe('Project name'),
  activityCount: z.number().describe('Number of activities included'),
  sessionCount: z.number().describe('Number of sessions included'),
})
export type ContextResponse = z.infer<typeof ContextResponseSchema>

export const TokenEconomicsSchema = z.object({
  tokensUsed: z.number().describe('Tokens spent by AI agent to generate activities'),
  readTokens: z.number().describe('Estimated tokens to render context'),
  savings: z.number().describe('tokensUsed - readTokens'),
  roi: z.number().describe('tokensUsed / readTokens ratio'),
  activityCount: z.number().describe('Number of activities included'),
})
export type TokenEconomics = z.infer<typeof TokenEconomicsSchema>

// ─── Search ───────────────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  query: z.string().default('').describe('Search query text (empty returns all recent)'),
  project: z.string().optional().describe('Filter by project'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Max results'),
  type: z.enum(['activities', 'sessions', 'prompts', 'all']).default('all'),
})
export type SearchQuery = z.infer<typeof SearchQuerySchema>

export const SearchResultSchema = z.object({
  id: z.number().describe('Activity or session ID'),
  type: z.string().describe('Result type'),
  title: z.string().nullable().describe('Title if available'),
  project: z.string().describe('Project name'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  score: z.number().optional().describe('Relevance score'),
})
export type SearchResult = z.infer<typeof SearchResultSchema>

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  query: z.string(),
})
export type SearchResponse = z.infer<typeof SearchResponseSchema>

// ─── Prompts ──────────────────────────────────────────────────────────────────

export const UserPromptSchema = z.object({
  id: z.number(),
  contentSessionId: z.string(),
  project: z.string(),
  promptNumber: z.number(),
  promptText: z.string(),
  createdAt: z.string(),
})
export type UserPrompt = z.infer<typeof UserPromptSchema>

export const PromptsListQuerySchema = z.object({
  project: z.string().optional().describe('Filter by project'),
  sessionId: z.string().optional().describe('Filter by session ID'),
  limit: z.coerce.number().min(1).max(200).default(50).describe('Max results'),
  offset: z.coerce.number().min(0).default(0).describe('Offset for pagination'),
})
export type PromptsListQuery = z.infer<typeof PromptsListQuerySchema>

export const PromptsListResponseSchema = z.object({
  prompts: z.array(UserPromptSchema),
  total: z.number(),
})
export type PromptsListResponse = z.infer<typeof PromptsListResponseSchema>

// ─── Raw Events ──────────────────────────────────────────────────────────────

export const RawEventSchema = z.object({
  id: z.number(),
  sessionId: z.string(),
  eventType: z.string(),
  payload: z.string(),
  createdAt: z.string(),
})
export type RawEvent = z.infer<typeof RawEventSchema>

export const RawEventsQuerySchema = z.object({
  sessionId: z.string().optional().describe('Filter by session ID'),
  limit: z.coerce.number().min(1).max(200).default(50).describe('Max results'),
  offset: z.coerce.number().min(0).default(0).describe('Offset for pagination'),
})
export type RawEventsQuery = z.infer<typeof RawEventsQuerySchema>

export const RawEventsResponseSchema = z.object({
  events: z.array(RawEventSchema),
  total: z.number(),
})
export type RawEventsResponse = z.infer<typeof RawEventsResponseSchema>

// ─── Queue (Pending Messages) ────────────────────────────────────────────────

export const QueueItemSchema = z.object({
  id: z.number(),
  sessionId: z.string(),
  messageType: z.string(),
  toolName: z.string().nullable(),
  status: z.string(),
  retryCount: z.number(),
  errorMessage: z.string().nullable(),
  createdAt: z.number(),
  claimedAt: z.number().nullable(),
})
export type QueueItem = z.infer<typeof QueueItemSchema>

export const QueueQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'failed', 'all']).default('all').describe('Filter by status'),
  sessionId: z.string().optional().describe('Filter by session ID'),
  limit: z.coerce.number().min(1).max(200).default(50).describe('Max results'),
})
export type QueueQuery = z.infer<typeof QueueQuerySchema>

export const QueueResponseSchema = z.object({
  items: z.array(QueueItemSchema),
  total: z.number(),
  counts: z.object({
    pending: z.number(),
    processing: z.number(),
    failed: z.number(),
  }),
})
export type QueueResponse = z.infer<typeof QueueResponseSchema>

// ─── Learnings ───────────────────────────────────────────────────────────────

export const LearningSchema = z.object({
  id: z.number(),
  canonicalKey: z.string().describe('Stable dedup key (e.g. "go/table-driven-tests")'),
  category: z.enum(['coding', 'tooling', 'architecture', 'debugging', 'review', 'workflow']),
  pattern: z.string().describe('Human-readable description of the practice'),
  confidence: z.number().describe('Confidence score — increases on re-observation'),
  evidenceCount: z.number().describe('Number of sessions that contributed'),
  topics: z.array(z.string()).describe('Topic tags for relevance matching'),
  firstSeenAt: z.number().describe('Timestamp of first observation'),
  lastSeenAt: z.number().describe('Timestamp of most recent observation'),
  archived: z.boolean().describe('Whether this learning has been archived'),
})
export type Learning = z.infer<typeof LearningSchema>

export const LearningQuerySchema = z.object({
  topic: z.string().optional().describe('Filter by topic tag'),
  category: z.enum(['coding', 'tooling', 'architecture', 'debugging', 'review', 'workflow']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  includeArchived: z.coerce.boolean().default(false),
})
export type LearningQuery = z.infer<typeof LearningQuerySchema>

export const LearningsResponseSchema = z.object({
  learnings: z.array(LearningSchema),
  total: z.number(),
})
export type LearningsResponse = z.infer<typeof LearningsResponseSchema>

export const LearningStatsSchema = z.object({
  total: z.number(),
  byCategory: z.record(z.number()),
  avgConfidence: z.number(),
})
export type LearningStats = z.infer<typeof LearningStatsSchema>

// ─── Retention ───────────────────────────────────────────────────────────────

export const RetentionStatsSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    rowCount: z.number(),
    ttlDays: z.number().nullable(),
  })),
  dbSizeBytes: z.number(),
  lastCleanupAt: z.string().nullable(),
  nextCleanupAt: z.string().nullable(),
})
export type RetentionStats = z.infer<typeof RetentionStatsSchema>

export const CleanupReportSchema = z.object({
  startedAt: z.string(),
  completedAt: z.string(),
  deletions: z.record(z.number()),
})
export type CleanupReport = z.infer<typeof CleanupReportSchema>

// ─── Hook Input (Claude Code stdin format) ────────────────────────────────────
// Claude Code sends different fields per event type:
//   SessionStart:      session_id, cwd, hook_event_name
//   UserPromptSubmit:  session_id, cwd, prompt              ← user's actual message
//   PostToolUse:       session_id, cwd, tool_name, tool_input, tool_response
//   Stop:              session_id, cwd, transcript_path

export const HookInputSchema = z.object({
  session_id: z.string().optional(),
  cwd: z.string().optional(),
  prompt: z.string().optional(),
  tool_name: z.string().optional(),
  tool_input: z.unknown().optional(),
  tool_response: z.unknown().optional(),
  transcript_path: z.string().optional(),
  hook_event_name: z.string().optional(),
})
export type HookInput = z.infer<typeof HookInputSchema>
