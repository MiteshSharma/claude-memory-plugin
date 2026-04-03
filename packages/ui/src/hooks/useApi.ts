import { useQuery } from '@tanstack/react-query'
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
