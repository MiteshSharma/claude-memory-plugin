import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  LearningQuerySchema,
  LearningsResponseSchema,
  LearningStatsSchema,
} from '@memory-updater/shared'
import { LearningRepository } from '../repositories/LearningRepository.js'

export async function learningRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const learningRepo = new LearningRepository(app.db)

  // GET /api/learnings — list learnings
  router.get(
    '/',
    {
      schema: {
        tags: ['Learnings'],
        summary: 'List global learnings (coding practices and patterns)',
        querystring: LearningQuerySchema,
        response: { 200: LearningsResponseSchema },
      },
    },
    async (req, reply) => {
      const q = req.query as z.infer<typeof LearningQuerySchema>

      let learnings
      let total: number

      if (q.topic) {
        const results = learningRepo.findByTopics([q.topic], q.limit)
        learnings = results
        total = results.length
      } else if (q.category) {
        const results = learningRepo.findByCategory(q.category, q.limit)
        learnings = results
        total = results.length
      } else {
        const result = learningRepo.findAll({
          limit: q.limit,
          offset: q.offset,
          includeArchived: q.includeArchived,
        })
        learnings = result.learnings
        total = result.total
      }

      return reply.code(200).send({
        learnings: learnings.map((l) => ({
          id: l.id,
          canonicalKey: l.canonicalKey,
          category: l.category as 'coding' | 'tooling' | 'architecture' | 'debugging' | 'review' | 'workflow',
          pattern: l.pattern,
          confidence: l.confidence,
          evidenceCount: l.evidenceCount,
          topics: JSON.parse(l.topics),
          firstSeenAt: l.firstSeenAt,
          lastSeenAt: l.lastSeenAt,
          archived: l.archived === 1,
        })),
        total,
      })
    },
  )

  // GET /api/learnings/stats — category counts
  router.get(
    '/stats',
    {
      schema: {
        tags: ['Learnings'],
        summary: 'Get learning statistics by category',
        response: { 200: LearningStatsSchema },
      },
    },
    async (_req, reply) => {
      const stats = learningRepo.getStats()
      return reply.code(200).send(stats)
    },
  )

  // DELETE /api/learnings/:id — hard delete
  router.delete(
    '/:id',
    {
      schema: {
        tags: ['Learnings'],
        summary: 'Delete a learning permanently',
        params: z.object({ id: z.coerce.number() }),
        response: { 200: z.object({ deleted: z.boolean() }) },
      },
    },
    async (req, reply) => {
      learningRepo.delete(req.params.id)
      return reply.code(200).send({ deleted: true })
    },
  )

  // POST /api/learnings/:id/archive — soft-archive
  router.post(
    '/:id/archive',
    {
      schema: {
        tags: ['Learnings'],
        summary: 'Archive a learning (soft delete)',
        params: z.object({ id: z.coerce.number() }),
        response: { 200: z.object({ archived: z.boolean() }) },
      },
    },
    async (req, reply) => {
      learningRepo.archive(req.params.id)
      return reply.code(200).send({ archived: true })
    },
  )

  // POST /api/learnings/decay — trigger decay pass
  router.post(
    '/decay',
    {
      schema: {
        tags: ['Learnings'],
        summary: 'Trigger confidence decay for stale learnings',
        response: { 200: z.object({ decayed: z.number() }) },
      },
    },
    async (_req, reply) => {
      const decayed = learningRepo.decayStale(6)
      return reply.code(200).send({ decayed })
    },
  )
}
