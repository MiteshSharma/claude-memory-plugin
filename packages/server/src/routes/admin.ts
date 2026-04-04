import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CleanupReportSchema, RetentionStatsSchema } from '@memory-updater/shared'
import { SessionRepository } from '../repositories/SessionRepository.js'
import { ActivityRepository } from '../repositories/ActivityRepository.js'
import { SummaryRepository } from '../repositories/SummaryRepository.js'
import { PromptRepository } from '../repositories/PromptRepository.js'
import { PendingMessageRepository } from '../repositories/PendingMessageRepository.js'
import { LearningRepository } from '../repositories/LearningRepository.js'
import { RETENTION } from '../config.js'

const AdminResponseSchema = z.object({ ok: z.boolean() })

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()

  // Restrict all /api/admin/* to localhost only
  app.addHook('onRequest', async (req, reply) => {
    const ip = req.socket.remoteAddress
    if (ip !== '127.0.0.1' && ip !== '::1') {
      return reply.code(403).send({ error: 'Admin endpoints are localhost-only' })
    }
  })

  // POST /api/admin/restart — gracefully restarts via process exit (process manager restarts)
  router.post(
    '/restart',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Gracefully restart the server process',
        response: { 200: AdminResponseSchema },
      },
    },
    async (_req, reply) => {
      setImmediate(() => process.exit(0))
      return reply.code(200).send({ ok: true })
    },
  )

  // POST /api/admin/shutdown — stops the worker cleanly
  router.post(
    '/shutdown',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Shut down the server process cleanly',
        response: { 200: AdminResponseSchema },
      },
    },
    async (_req, reply) => {
      setImmediate(() => process.exit(0))
      return reply.code(200).send({ ok: true })
    },
  )

  // GET /api/admin/retention — retention stats per table
  router.get(
    '/retention',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get retention stats for all tables',
        response: { 200: RetentionStatsSchema },
      },
    },
    async (_req, reply) => {
      const sessionRepo = new SessionRepository(app.db)
      const activityRepo = new ActivityRepository(app.db)
      const summaryRepo = new SummaryRepository(app.db)
      const promptRepo = new PromptRepository(app.db)
      const queueRepo = new PendingMessageRepository(app.db)
      const learningRepo = new LearningRepository(app.db)

      const { lastCleanupAt, nextCleanupAt } = app.cleanupService.getStatus()

      const tables = [
        { name: 'raw_events', rowCount: activityRepo.countRawEvents(), ttlDays: RETENTION.RAW_EVENTS_DAYS },
        { name: 'pending_messages', rowCount: queueRepo.countByStatus().pending + queueRepo.countByStatus().processing + queueRepo.countByStatus().failed, ttlDays: RETENTION.PENDING_MESSAGES_DAYS },
        { name: 'activities', rowCount: activityRepo.countAll(), ttlDays: RETENTION.ACTIVITIES_DAYS },
        { name: 'user_prompts', rowCount: promptRepo.listRecent({}).total, ttlDays: RETENTION.PROMPTS_DAYS },
        { name: 'sessions', rowCount: sessionRepo.countAll(), ttlDays: RETENTION.SESSIONS_DAYS },
        { name: 'session_summaries', rowCount: summaryRepo.countAll(), ttlDays: RETENTION.SUMMARIES_DAYS },
        { name: 'global_learnings', rowCount: learningRepo.countAll(), ttlDays: null },
      ]

      return reply.code(200).send({
        tables,
        dbSizeBytes: 0, // Would need fs.stat on the DB file
        lastCleanupAt,
        nextCleanupAt,
      })
    },
  )

  // POST /api/admin/retention/cleanup — trigger manual cleanup
  router.post(
    '/retention/cleanup',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Trigger retention cleanup manually',
        response: { 200: CleanupReportSchema },
      },
    },
    async (_req, reply) => {
      const report = await app.cleanupService.runCleanup()
      return reply.code(200).send(report)
    },
  )

  // GET /api/admin/retention/config — current TTL configuration
  router.get(
    '/retention/config',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get current retention TTL configuration',
        response: { 200: z.object({
          rawEventsDays: z.number(),
          pendingMessagesDays: z.number(),
          activitiesDays: z.number(),
          promptsDays: z.number(),
          sessionsDays: z.number(),
          summariesDays: z.number(),
          cleanupIntervalHours: z.number(),
          learningDecayMonths: z.number(),
        }) },
      },
    },
    async (_req, reply) => {
      return reply.code(200).send({
        rawEventsDays: RETENTION.RAW_EVENTS_DAYS,
        pendingMessagesDays: RETENTION.PENDING_MESSAGES_DAYS,
        activitiesDays: RETENTION.ACTIVITIES_DAYS,
        promptsDays: RETENTION.PROMPTS_DAYS,
        sessionsDays: RETENTION.SESSIONS_DAYS,
        summariesDays: RETENTION.SUMMARIES_DAYS,
        cleanupIntervalHours: RETENTION.CLEANUP_INTERVAL_HOURS,
        learningDecayMonths: RETENTION.LEARNING_DECAY_MONTHS,
      })
    },
  )
}
