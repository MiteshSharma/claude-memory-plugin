import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PromptsListQuerySchema, PromptsListResponseSchema, type PromptsListQuery } from '@claude-plugin-kit/shared'
import { PromptRepository } from '../repositories/PromptRepository.js'

export async function promptRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const promptRepo = new PromptRepository(app.db)

  router.get(
    '/',
    {
      schema: {
        tags: ['Prompts'],
        summary: 'List user prompts with optional project/session filter',
        querystring: PromptsListQuerySchema,
        response: { 200: PromptsListResponseSchema },
      },
    },
    async (req, reply) => {
      const q = req.query as PromptsListQuery
      const { prompts, total } = promptRepo.listRecent({
        project: q.project,
        sessionId: q.sessionId,
        limit: q.limit,
        offset: q.offset,
      })
      return reply.code(200).send({ prompts, total })
    },
  )
}
