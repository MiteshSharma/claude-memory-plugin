import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { RawEventsQuerySchema, RawEventsResponseSchema } from '@memory-updater/shared'
import { ActivityRepository } from '../repositories/ActivityRepository.js'

export async function rawEventRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const activityRepo = new ActivityRepository(app.db)

  router.get(
    '/',
    {
      schema: {
        tags: ['Debug'],
        summary: 'List raw events (intake buffer)',
        querystring: RawEventsQuerySchema,
        response: { 200: RawEventsResponseSchema },
      },
    },
    async (req, reply) => {
      const { limit, offset, sessionId } = req.query
      const { events, total } = activityRepo.listRawEvents({ limit, offset, ...(sessionId !== undefined && { sessionId }) })
      return reply.code(200).send({ events, total })
    },
  )
}
