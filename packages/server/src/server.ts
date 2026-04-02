import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import type { Db } from './db/database.js'
import { registerSwagger } from './plugins/swagger.js'
import { registerRoutes } from './routes/index.js'
import { LOG_LEVEL, IS_DEV } from './config.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}

export async function createServer(db: Db): Promise<FastifyInstance> {
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

  // Expose db to all route handlers via app.db
  app.decorate('db', db)

  await registerRoutes(app)

  return app
}
