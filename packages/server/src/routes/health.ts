import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HealthResponseSchema, StatsResponseSchema } from '@claude-plugin-kit/shared'
import { HealthService } from '../services/HealthService.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { isReady } from '../lib/state.js'

const ProcessingStatusSchema = z.object({
  pending: z.number(),
  processing: z.number(),
  failed: z.number(),
  activeSessions: z.number(),
  sessionIds: z.array(z.string()),
  isProcessing: z.boolean(),
})

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const healthService = new HealthService(app.db)
  const queueRepo = new PendingMessageRepository(app.db)

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

  router.get(
    '/processing-status',
    {
      schema: {
        tags: ['Health'],
        summary: 'Get queue processing status',
        response: { 200: ProcessingStatusSchema },
      },
    },
    async (_req, reply) => {
      const counts = queueRepo.countByStatus()
      const sessionIds = queueRepo.getSessionsWithPending()
      return reply.code(200).send({
        ...counts,
        activeSessions: sessionIds.length,
        sessionIds,
        isProcessing: counts.pending > 0 || counts.processing > 0,
      })
    },
  )

  // Readiness probe — 503 until DB + SessionManager fully initialised
  router.get(
    '/readiness',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness probe — 503 until server is fully initialised',
        response: {
          200: z.object({ status: z.literal('ready') }),
          503: z.object({ status: z.literal('starting') }),
        },
      },
    },
    async (_req, reply) => {
      if (!isReady()) {
        return reply.code(503).send({ status: 'starting' })
      }
      return reply.code(200).send({ status: 'ready' })
    },
  )
}
