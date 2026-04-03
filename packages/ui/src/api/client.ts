const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

// Types matching server responses
export interface SessionSummary {
  id: number
  request: string
  investigated: string
  insights: string
  completed: string
  pendingWork: string
  notes: string
  tokensUsed: number
  createdAt: number
}

export interface Session {
  id: number
  sessionId: string
  project: string
  workDir: string
  platform: string
  status: string
  promptCounter: number
  createdAt: string
  completedAt: string | null
  summary: SessionSummary | null
}

export interface TimelinePromptItem {
  kind: 'prompt'
  id: number
  promptNumber: number
  promptText: string
  createdAt: string
}

export interface TimelineActivityItem {
  kind: 'activity'
  id: number
  promptNumber: number | null
  type: string
  title: string
  narrative: string
  facts: string
  concepts: string
  filesRead: string
  filesModified: string
  createdAt: number
}

export type TimelineItem = TimelinePromptItem | TimelineActivityItem

export interface TimelineResponse {
  items: TimelineItem[]
  sessionId: string
  promptCount: number
  activityCount: number
}

export interface PatternItem {
  value: string
  count: number
}

export interface PatternsResponse {
  topFiles: PatternItem[]
  topConcepts: PatternItem[]
  project: string | null
}

export interface Activity {
  id: number
  type: string
  title: string
  subtitle: string | null
  narrative: string
  facts: string
  concepts: string
  filesRead: string
  filesModified: string
  project: string
  sessionId: string
  createdAt: number
  tokensUsed: number
}

export interface Summary {
  id: number
  sessionId: string
  project: string
  request: string
  investigated: string
  insights: string
  completed: string
  pendingWork: string
  notes: string
  tokensUsed: number
  createdAt: number
}

export interface SearchResult {
  id: number
  type: string
  title: string | null
  project: string
  createdAt: string
  score?: number
}

export interface Stats {
  sessions: number
  activities: number
  rawEvents: number
  uptime: number
}

export interface Health {
  status: string
  version: string
  uptime: number
  pid: number
  db: boolean
  timestamp: string
}

export interface ProcessingStatus {
  pending: number
  processing: number
  failed: number
  activeSessions: number
  isProcessing: boolean
}

export interface ContextResponse {
  context: string
  project: string
  activityCount: number
  sessionCount: number
}

export interface TokenEconomics {
  tokensUsed: number
  readTokens: number
  savings: number
  roi: number
  activityCount: number
}

export interface UserPrompt {
  id: number
  contentSessionId: string
  project: string
  promptNumber: number
  promptText: string
  createdAt: string
}

export interface RawEvent {
  id: number
  sessionId: string
  eventType: string
  payload: string
  createdAt: string
}

export interface QueueItem {
  id: number
  sessionId: string
  messageType: string
  toolName: string | null
  status: string
  retryCount: number
  errorMessage: string | null
  createdAt: number
  claimedAt: number | null
}

export interface QueueResponse {
  items: QueueItem[]
  total: number
  counts: { pending: number; processing: number; failed: number }
}

export const api = {
  health: () => get<Health>('/health'),
  stats: () => get<Stats>('/stats'),
  processingStatus: () => get<ProcessingStatus>('/processing-status'),

  search: {
    unified: (query: string, project?: string, type = 'all', limit = 20) => {
      const params = new URLSearchParams({ query, type, limit: String(limit) })
      if (project) params.set('project', project)
      return get<{ results: SearchResult[]; total: number; query: string }>(`/search?${params}`)
    },
    details: (ids: number[]) =>
      get<{ activities: Activity[] }>(`/search/details?ids=${ids.join(',')}`),
    timeline: (opts: { anchor?: number; query?: string; before?: number; after?: number }) => {
      const params = new URLSearchParams()
      if (opts.anchor) params.set('anchor', String(opts.anchor))
      if (opts.query) params.set('query', opts.query)
      if (opts.before) params.set('before', String(opts.before))
      if (opts.after) params.set('after', String(opts.after))
      return get<{ activities: Activity[]; anchor: number | null; total: number }>(
        `/search/timeline?${params}`,
      )
    },
  },

  context: {
    inject: (project?: string, mode = 'standard') => {
      const params = new URLSearchParams({ mode })
      if (project) params.set('project', project)
      return get<ContextResponse>(`/context/inject?${params}`)
    },
    tokenEconomics: (project?: string) => {
      const params = new URLSearchParams()
      if (project) params.set('project', project)
      return get<TokenEconomics>(`/context/token-economics?${params}`)
    },
  },

  rawEvents: {
    list: (sessionId?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (sessionId) params.set('sessionId', sessionId)
      return get<{ events: RawEvent[]; total: number }>(`/raw-events?${params}`)
    },
  },

  queue: {
    list: (status = 'all', sessionId?: string, limit = 50) => {
      const params = new URLSearchParams({ status, limit: String(limit) })
      if (sessionId) params.set('sessionId', sessionId)
      return get<QueueResponse>(`/queue?${params}`)
    },
  },

  sessions: {
    list: (project?: string, limit = 20) => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (project) params.set('project', project)
      return get<{ sessions: Session[]; total: number }>(`/sessions?${params}`)
    },
    timeline: (sessionId: string) =>
      get<TimelineResponse>(`/sessions/${sessionId}/timeline`),
  },

  patterns: {
    get: (project?: string, limit = 10) => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (project) params.set('project', project)
      return get<PatternsResponse>(`/patterns?${params}`)
    },
  },

  prompts: {
    list: (project?: string, sessionId?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (project) params.set('project', project)
      if (sessionId) params.set('sessionId', sessionId)
      return get<{ prompts: UserPrompt[]; total: number }>(`/prompts?${params}`)
    },
  },

  projects: () => get<{ projects: string[] }>('/projects'),
}
