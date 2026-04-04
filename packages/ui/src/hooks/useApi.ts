import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
  })
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: api.stats,
    refetchInterval: 10_000,
  })
}

export function useProcessingStatus() {
  return useQuery({
    queryKey: ['processing-status'],
    queryFn: api.processingStatus,
    refetchInterval: 5_000,
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: api.projects,
  })
}

export function useSessions(project?: string) {
  return useQuery({
    queryKey: ['sessions', project],
    queryFn: () => api.sessions.list(project, 50),
    refetchInterval: 10_000,
  })
}

export function useTimeline(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['timeline', sessionId],
    queryFn: () => api.sessions.timeline(sessionId!),
    enabled: !!sessionId,
  })
}

export function usePatterns(project?: string) {
  return useQuery({
    queryKey: ['patterns', project],
    queryFn: () => api.patterns.get(project, 15),
    refetchInterval: 30_000,
  })
}

export function useSearch(query: string, project?: string, type = 'all') {
  return useQuery({
    queryKey: ['search', query, project, type],
    queryFn: () => api.search.unified(query, project, type),
    enabled: query.length > 0,
  })
}

export function useContext(project?: string) {
  return useQuery({
    queryKey: ['context', project],
    queryFn: () => api.context.inject(project, 'standard'),
    enabled: !!project,
  })
}

export function useTokenEconomics(project?: string) {
  return useQuery({
    queryKey: ['token-economics', project],
    queryFn: () => api.context.tokenEconomics(project),
    enabled: !!project,
  })
}

export function useRawEvents(sessionId?: string) {
  return useQuery({
    queryKey: ['raw-events', sessionId],
    queryFn: () => api.rawEvents.list(sessionId, 100),
    refetchInterval: 5_000,
  })
}

export function usePrompts(project?: string, sessionId?: string) {
  return useQuery({
    queryKey: ['prompts', project, sessionId],
    queryFn: () => api.prompts.list(project, sessionId, 100),
    refetchInterval: 10_000,
  })
}

export function useQueue(status = 'all') {
  return useQuery({
    queryKey: ['queue', status],
    queryFn: () => api.queue.list(status),
    refetchInterval: 3_000,
  })
}

// ─── Learnings ───────────────────────────────────────────────────────────────

export function useLearnings(opts?: { topic?: string; category?: string; includeArchived?: boolean }) {
  return useQuery({
    queryKey: ['learnings', opts?.topic, opts?.category, opts?.includeArchived],
    queryFn: () => api.learnings.list({ ...opts, limit: 100 }),
    refetchInterval: 30_000,
  })
}

export function useLearningStats() {
  return useQuery({
    queryKey: ['learning-stats'],
    queryFn: api.learnings.stats,
    refetchInterval: 30_000,
  })
}

export function useCreateLearning() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { canonicalKey: string; category: string; pattern: string; topics: string[]; confidence: number }) =>
      api.learnings.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learnings'] })
      qc.invalidateQueries({ queryKey: ['learning-stats'] })
    },
  })
}

export function useArchiveLearning() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.learnings.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learnings'] })
      qc.invalidateQueries({ queryKey: ['learning-stats'] })
    },
  })
}

export function useDeleteLearning() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.learnings.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learnings'] })
      qc.invalidateQueries({ queryKey: ['learning-stats'] })
    },
  })
}

export function useDecayLearnings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.learnings.decay(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learnings'] })
      qc.invalidateQueries({ queryKey: ['learning-stats'] })
    },
  })
}

// ─── Retention ───────────────────────────────────────────────────────────────

export function useRetentionStats() {
  return useQuery({
    queryKey: ['retention-stats'],
    queryFn: api.retention.stats,
    refetchInterval: 60_000,
  })
}

export function useRetentionConfig() {
  return useQuery({
    queryKey: ['retention-config'],
    queryFn: api.retention.config,
  })
}

export function useTriggerCleanup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.retention.cleanup(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retention-stats'] })
      qc.invalidateQueries({ queryKey: ['learnings'] })
      qc.invalidateQueries({ queryKey: ['learning-stats'] })
    },
  })
}
