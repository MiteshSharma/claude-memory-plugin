import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

const clients = new Set<FastifyReply>()

export async function sseRoutes(app: FastifyInstance): Promise<void> {
  // Excluded from Swagger (hide: true) — non-JSON endpoint
  app.get(
    '/stream',
    { schema: { hide: true } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')
      reply.raw.flushHeaders()

      clients.add(reply)
      reply.raw.write('event: connected\ndata: {"status":"ok"}\n\n')

      // Heartbeat every 30 seconds to keep connection alive through proxies
      const keepAlive = setInterval(() => reply.raw.write(':ping\n\n'), 30_000)

      req.raw.on('close', () => {
        clients.delete(reply)
        clearInterval(keepAlive)
      })

      return reply
    },
  )
}

export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    client.raw.write(payload)
  }
}

export function getClientCount(): number {
  return clients.size
}
