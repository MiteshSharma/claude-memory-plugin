import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { RawEventsQuerySchema, RawEventsResponseSchema } from '@claude-plugin-kit/shared'
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
      const { events, total } = activityRepo.listRawEvents(req.query)
      return reply.code(200).send({ events, total })
    },
  )
}
