import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
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

  return app
}
