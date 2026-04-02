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
  activities: z.number().describe('Total activities stored'),
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
})
export type ContextQuery = z.infer<typeof ContextQuerySchema>

export const ContextResponseSchema = z.object({
  context: z.string().describe('Markdown-formatted memory context for injection'),
  project: z.string().describe('Project name'),
  activityCount: z.number().describe('Number of activities included'),
  sessionCount: z.number().describe('Number of sessions included'),
})
export type ContextResponse = z.infer<typeof ContextResponseSchema>

// ─── Search ───────────────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  query: z.string().min(1).describe('Search query text'),
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
