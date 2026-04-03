import { existsSync } from 'fs'
import path from 'path'
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import type { Db } from './db/database.js'
import type { SessionManager } from './agent/SessionManager.js'
import { registerSwagger } from './plugins/swagger.js'
import { registerRoutes } from './routes/index.js'
import { LOG_LEVEL, IS_DEV } from './config.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    sessionManager: SessionManager
  }
}

export async function createServer(
  db: Db,
  sessionManager: SessionManager,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: IS_DEV
      ? {
          level: LOG_LEVEL,
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : { level: LOG_LEVEL },
  })

  // Swagger MUST be registered before routes (sets validator/serializer compilers)
  await registerSwagger(app)

  await app.register(cors, { origin: true })

  // Expose db and session manager to all route handlers
  app.decorate('db', db)
  app.decorate('sessionManager', sessionManager)

  await registerRoutes(app)

  // Serve built UI if available
  const uiPaths = [
    path.resolve(process.cwd(), 'plugin/ui'),
    path.resolve(process.cwd(), '../../plugin/ui'),
    path.resolve(process.cwd(), '../plugin/ui'),
  ]
  const uiDir = uiPaths.find((p) => existsSync(path.join(p, 'index.html')))

  if (uiDir) {
    await app.register(fastifyStatic, {
      root: uiDir,
      prefix: '/',
      decorateReply: false,
    })

    // SPA fallback — serve index.html for non-API, non-docs routes
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/docs')) {
        return reply.code(404).send({ error: 'Not Found' })
      }
      return reply.sendFile('index.html', uiDir)
    })
  }

  return app
}
