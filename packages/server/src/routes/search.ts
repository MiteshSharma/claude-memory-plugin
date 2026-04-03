import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { SearchQuerySchema, SearchResponseSchema } from '@claude-plugin-kit/shared'
import { SearchService } from '../services/SearchService.js'

const TimelineQuerySchema = z.object({
  anchor: z.coerce.number().optional().describe('Activity ID to center on'),
  query: z.string().optional().describe('Query to find anchor automatically'),
  before: z.coerce.number().optional().default(5).describe('Events before anchor'),
  after: z.coerce.number().optional().default(5).describe('Events after anchor'),
  project: z.string().optional().describe('Filter by project'),
})

const ActivityIdsSchema = z.object({
  ids: z.string().describe('Comma-separated activity IDs'),
})

const ActivityDetailSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  narrative: z.string(),
  facts: z.string(),
  concepts: z.string(),
  filesRead: z.string(),
  filesModified: z.string(),
  project: z.string(),
  sessionId: z.string(),
  createdAt: z.number(),
  tokensUsed: z.number(),
})

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const searchService = new SearchService(app.db)

  // GET /api/search — unified search
  router.get(
    '/',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search activities, summaries, and prompts',
        querystring: SearchQuerySchema,
        response: { 200: SearchResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await searchService.search(req.query)
      return reply.code(200).send(result)
    },
  )

  // GET /api/search/activities — activities only with pagination
  router.get(
    '/activities',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search activities only (paginated)',
        querystring: SearchQuerySchema,
        response: { 200: SearchResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await searchService.search({ ...req.query, type: 'activities' })
      return reply.code(200).send(result)
    },
  )

  // GET /api/search/sessions — session summaries only
  router.get(
    '/sessions',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search session summaries',
        querystring: SearchQuerySchema,
        response: { 200: SearchResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await searchService.search({ ...req.query, type: 'sessions' })
      return reply.code(200).send(result)
    },
  )

  // GET /api/timeline — anchor-based context window
  router.get(
    '/timeline',
    {
      schema: {
        tags: ['Search'],
        summary: 'Get context timeline around an activity',
        querystring: TimelineQuerySchema,
        response: {
          200: z.object({
            activities: z.array(ActivityDetailSchema),
            anchor: z.number().nullable(),
            total: z.number(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { anchor, query, before, after, project } = req.query

      let result: Awaited<ReturnType<typeof searchService.getTimeline>>
      if (anchor) {
        result = searchService.getTimeline(anchor, before, after)
      } else if (query) {
        result = searchService.findTimelineByQuery(query, project, before, after)
      } else {
        result = []
      }

      const anchorId = anchor ?? (result.length > 0 ? result[0]!.id : null)

      return reply.code(200).send({
        activities: result,
        anchor: anchorId,
        total: result.length,
      })
    },
  )

  // GET /api/search/details — fetch full activity details by IDs
  router.get(
    '/details',
    {
      schema: {
        tags: ['Search'],
        summary: 'Fetch full activity details by IDs',
        querystring: ActivityIdsSchema,
        response: {
          200: z.object({
            activities: z.array(ActivityDetailSchema),
          }),
        },
      },
    },
    async (req, reply) => {
      const ids = req.query.ids
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))

      const result = searchService.getActivitiesByIds(ids)
      return reply.code(200).send({ activities: result })
    },
  )
}
