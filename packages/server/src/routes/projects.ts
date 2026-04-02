import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { SessionRepository } from '../repositories/SessionRepository.js'

const ProjectsResponseSchema = z.object({
  projects: z.array(z.string()).describe('Distinct project names with at least one session'),
})

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>()
  const sessionRepo = new SessionRepository(app.db)

  router.get(
    '/projects',
    {
      schema: {
        tags: ['Projects'],
        summary: 'List all distinct project names',
        response: { 200: ProjectsResponseSchema },
      },
    },
    async (_req, reply) => {
      const projects = sessionRepo.findDistinctProjects()
      return reply.code(200).send({ projects })
    },
  )
}
