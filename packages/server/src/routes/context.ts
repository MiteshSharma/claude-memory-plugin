import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  ContextQuerySchema,
  ContextResponseSchema,
  TokenEconomicsSchema,
} from '@claude-plugin-kit/shared'
import { ContextService } from '../services/ContextService.js'

export async function contextRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const contextService = new ContextService(app.db)

  // GET /api/context/inject — called by SessionStart hook
  router.get(
    '/inject',
    {
      schema: {
        tags: ['Context'],
        summary: 'Get memory context for injection into a new session',
        querystring: ContextQuerySchema,
        response: { 200: ContextResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await contextService.getInjectableContext(
        req.query.project,
        req.query.mode,
        req.query.debug,
      )
      return reply.code(200).send(result)
    },
  )

  // GET /api/context/preview — used by settings UI
  router.get(
    '/preview',
    {
      schema: {
        tags: ['Context'],
        summary: 'Preview context that will be injected on next session start',
        querystring: ContextQuerySchema,
        response: { 200: ContextResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await contextService.getPreview(req.query.project, req.query.mode)
      return reply.code(200).send(result)
    },
  )

  // GET /api/context/token-economics
  router.get(
    '/token-economics',
    {
      schema: {
        tags: ['Context'],
        summary: 'Get token economics breakdown for a project',
        querystring: z.object({
          project: z.string().optional().describe('Project name'),
        }),
        response: { 200: TokenEconomicsSchema },
      },
    },
    async (req, reply) => {
      const result = await contextService.getTokenEconomics(req.query.project)
      return reply.code(200).send(result)
    },
  )
}
