import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { QueueQuerySchema, QueueResponseSchema } from '@memory-updater/shared'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'

export async function queueRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const queueRepo = new PendingMessageRepository(app.db)

  router.get(
    '/',
    {
      schema: {
        tags: ['Debug'],
        summary: 'List pending messages in the processing queue',
        querystring: QueueQuerySchema,
        response: { 200: QueueResponseSchema },
      },
    },
    async (req, reply) => {
      const { status, limit, sessionId } = req.query
      const items = queueRepo.listAll({ status, limit, ...(sessionId !== undefined && { sessionId }) })
      const counts = queueRepo.countByStatus()
      return reply.code(200).send({
        items,
        total: items.length,
        counts,
      })
    },
  )
}
