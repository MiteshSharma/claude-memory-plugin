import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  SessionInitRequestSchema,
  SessionInitResponseSchema,
  SessionCompleteRequestSchema,
  SessionCompleteResponseSchema,
  SummarizeRequestSchema,
  SummarizeResponseSchema,
  SessionsListResponseSchema,
  ErrorResponseSchema,
} from '@claude-plugin-kit/shared'
import { SessionService } from '../services/SessionService.js'

const SessionsQuerySchema = z.object({
  project: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const sessionService = new SessionService(app.db)
  sessionService.setSessionManager(app.sessionManager)

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
        summary: 'List sessions (paginated)',
        querystring: SessionsQuerySchema,
        response: { 200: SessionsListResponseSchema },
      },
    },
    async (req, reply) => {
      const rows = sessionService.findAll(req.query.project, req.query.limit)
      return reply.code(200).send({ sessions: rows, total: rows.length })
    },
  )
}
