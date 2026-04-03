import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  ActivityRequestSchema,
  ActivityResponseSchema,
  SearchQuerySchema,
  SearchResponseSchema,
  ErrorResponseSchema,
} from '@memory-updater/shared'
import { ActivityService } from '../services/ActivityService.js'

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const activityService = new ActivityService(app.db)
  activityService.setSessionManager(app.sessionManager)

  // POST /api/activities
  router.post(
    '/',
    {
      schema: {
        tags: ['Activities'],
        summary: 'Store a tool usage activity from PostToolUse hook',
        body: ActivityRequestSchema,
        response: {
          201: ActivityResponseSchema,
          400: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await activityService.store(req.body)
      return reply.code(201).send(result)
    },
  )

  // GET /api/activities/search
  router.get(
    '/search',
    {
      schema: {
        tags: ['Activities'],
        summary: 'Search activities (Phase 5: full vector search)',
        querystring: SearchQuerySchema,
        response: { 200: SearchResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await activityService.search(req.query)
      return reply.code(200).send(result)
    },
  )
}
