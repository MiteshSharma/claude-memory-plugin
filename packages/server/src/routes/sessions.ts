import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  SessionInitRequestSchema,
  SessionInitResponseSchema,
  SessionCompleteRequestSchema,
  SessionCompleteResponseSchema,
  SessionPromptRequestSchema,
  SessionPromptResponseSchema,
  SessionTouchRequestSchema,
  SessionTouchResponseSchema,
  SummarizeRequestSchema,
  SummarizeResponseSchema,
  SessionsWithSummaryResponseSchema,
  TimelineResponseSchema,
  ErrorResponseSchema,
} from '@memory-updater/shared'
import { SessionService } from '../services/SessionService.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { PromptRepository } from '../repositories/PromptRepository.js'

const SessionsQuerySchema = z.object({
  project: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(20),
  offset: z.coerce.number().min(0).default(0),
})

const TimelineParamsSchema = z.object({
  sessionId: z.string(),
})

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const sessionService = new SessionService(app.db)
  sessionService.setSessionManager(app.sessionManager)
  const summaryRepo = new SummaryRepository(app.db)
  const activityRepo = new ActivityRepository(app.db)
  const promptRepo = new PromptRepository(app.db)

  // POST /api/sessions/init
  router.post(
    '/init',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Initialize or resume a Claude Code session',
        body: SessionInitRequestSchema,
        response: {
          201: SessionInitResponseSchema,
          400: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await sessionService.init(req.body)
      return reply.code(201).send(result)
    },
  )

  // POST /api/sessions/complete
  router.post(
    '/complete',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Mark a session as complete',
        body: SessionCompleteRequestSchema,
        response: {
          200: SessionCompleteResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await sessionService.complete(req.body.sessionId)
      return reply.code(200).send(result)
    },
  )

  // POST /api/sessions/prompt
  router.post(
    '/prompt',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Record a user prompt against an existing session',
        body: SessionPromptRequestSchema,
        response: {
          200: SessionPromptResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await sessionService.recordPrompt(req.body)
      return reply.code(200).send(result)
    },
  )

  // POST /api/sessions/touch
  router.post(
    '/touch',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Update lastActivityAt to keep session alive',
        body: SessionTouchRequestSchema,
        response: {
          200: SessionTouchResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await sessionService.touch(req.body.sessionId)
      return reply.code(200).send(result)
    },
  )

  // POST /api/sessions/summarize
  router.post(
    '/summarize',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Enqueue a summarization job for the session',
        body: SummarizeRequestSchema,
        response: {
          202: SummarizeResponseSchema,
          400: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await sessionService.summarize(req.body.sessionId)
      return reply.code(202).send(result)
    },
  )

  // GET /api/sessions
  router.get(
    '/',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'List sessions with latest summary attached',
        querystring: SessionsQuerySchema,
        response: { 200: SessionsWithSummaryResponseSchema },
      },
    },
    async (req, reply) => {
      const q = req.query as z.infer<typeof SessionsQuerySchema>
      const rows = sessionService.findAll(q.project, q.limit)
      const sessionIds = rows.map((r) => r.sessionId)
      const summaryMap = summaryRepo.findLatestBySessionIds(sessionIds)

      const sessions = rows.map((r) => ({
        ...r,
        completedAt: r.completedAt ?? null,
        summary: summaryMap.get(r.sessionId) ?? null,
      }))

      return reply.code(200).send({ sessions, total: sessions.length })
    },
  )

  // GET /api/sessions/:sessionId/timeline
  router.get(
    '/:sessionId/timeline',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Interleaved prompts + activities for a session (chronological)',
        params: TimelineParamsSchema,
        response: { 200: TimelineResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const { sessionId } = req.params as z.infer<typeof TimelineParamsSchema>

      const prompts = promptRepo.findBySession(sessionId)
      const activities = activityRepo.findBySession(sessionId)

      if (prompts.length === 0 && activities.length === 0) {
        return reply.code(404).send({ error: 'No data found for this session' })
      }

      // Tag each item with kind and a numeric sort key (ms epoch)
      const promptItems = prompts.map((p) => ({
        kind: 'prompt' as const,
        id: p.id,
        promptNumber: p.promptNumber,
        promptText: p.promptText,
        createdAt: p.createdAt,
        _sortKey: new Date(p.createdAt).getTime(),
      }))

      const activityItems = activities.map((a) => ({
        kind: 'activity' as const,
        id: a.id,
        promptNumber: a.promptNumber ?? null,
        type: a.type,
        title: a.title,
        narrative: a.narrative,
        facts: a.facts,
        concepts: a.concepts,
        filesRead: a.filesRead,
        filesModified: a.filesModified,
        createdAt: a.createdAt,
        _sortKey: a.createdAt,
      }))

      const allItems = [...promptItems, ...activityItems].sort((a, b) => a._sortKey - b._sortKey)

      // Strip internal sort key
      const items = allItems.map(({ _sortKey: _, ...item }) => item)

      return reply.code(200).send({
        items,
        sessionId,
        promptCount: prompts.length,
        activityCount: activities.length,
      })
    },
  )
}
