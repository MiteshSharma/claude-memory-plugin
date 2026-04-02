import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

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
}
