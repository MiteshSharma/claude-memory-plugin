import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PatternsQuerySchema, PatternsResponseSchema, type PatternsQuery } from '@memory-updater/shared'
import { ActivityRepository } from '../repositories/ActivityRepository.js'

export async function patternRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const activityRepo = new ActivityRepository(app.db)

  router.get(
    '/',
    {
      schema: {
        tags: ['Patterns'],
        summary: 'Top recurring files and concepts across activities',
        querystring: PatternsQuerySchema,
        response: { 200: PatternsResponseSchema },
      },
    },
    async (req, reply) => {
      const q = req.query as PatternsQuery
      const { topFiles, topConcepts } = activityRepo.getPatterns({ project: q.project, limit: q.limit })
      return reply.code(200).send({
        topFiles,
        topConcepts,
        project: q.project ?? null,
      })
    },
  )
}
