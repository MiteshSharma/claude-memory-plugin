import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { HealthResponseSchema, StatsResponseSchema } from '@claude-plugin-kit/shared'
import { HealthService } from '../services/HealthService.js'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const healthService = new HealthService(app.db)

  router.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Check server and database health',
        response: { 200: HealthResponseSchema },
      },
    },
    async (_req, reply) => {
      const result = await healthService.getHealth()
      return reply.code(200).send(result)
    },
  )

  router.get(
    '/stats',
    {
      schema: {
        tags: ['Health'],
        summary: 'Get aggregate server statistics',
        response: { 200: StatsResponseSchema },
      },
    },
    async (_req, reply) => {
      const result = await healthService.getStats()
      return reply.code(200).send(result)
    },
  )
}
