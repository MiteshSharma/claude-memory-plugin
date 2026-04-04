import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  LearningQuerySchema,
  LearningsResponseSchema,
  LearningStatsSchema,
  LearningSchema,
  CreateLearningRequestSchema,
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

  // POST /api/learnings — create a manual learning
  router.post(
    '/',
    {
      schema: {
        tags: ['Learnings'],
        summary: 'Create a new global learning manually',
        body: CreateLearningRequestSchema,
        response: { 201: LearningSchema },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof CreateLearningRequestSchema>
      const key = body.canonicalKey.toLowerCase().replace(/[^a-z0-9/-]/g, '-').slice(0, 40)

      // Check for duplicate canonical key
      const existing = learningRepo.findByKey(key)
      if (existing) {
        return reply.code(409).send({ error: `Learning with key "${key}" already exists`, code: 'DUPLICATE_KEY' } as never)
      }

      const row = learningRepo.store({
        canonicalKey: key,
        category: body.category,
        pattern: body.pattern,
        topics: body.topics,
      })

      // Set custom confidence if provided (default store creates with 1.0)
      if (body.confidence && body.confidence !== 1.0) {
        learningRepo.setConfidence(row.id, body.confidence)
      }

      const created = learningRepo.findByKey(key)!
      return reply.code(201).send({
        id: created.id,
        canonicalKey: created.canonicalKey,
        category: created.category as 'coding' | 'tooling' | 'architecture' | 'debugging' | 'review' | 'workflow',
        pattern: created.pattern,
        confidence: created.confidence,
        evidenceCount: created.evidenceCount,
        topics: JSON.parse(created.topics),
        firstSeenAt: created.firstSeenAt,
        lastSeenAt: created.lastSeenAt,
        archived: created.archived === 1,
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
