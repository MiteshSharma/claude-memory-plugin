import { existsSync } from 'fs'
import path from 'path'
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import type { Db } from './db/database.js'
import type { SessionManager } from './agent/SessionManager.js'
import type { CleanupService } from './services/CleanupService.js'
import { registerSwagger } from './plugins/swagger.js'
import { registerRoutes } from './routes/index.js'
import { LOG_LEVEL, IS_DEV } from './config.js'
import { AppError } from './lib/errors.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    sessionManager: SessionManager
    cleanupService: CleanupService
  }
}

export async function createServer(
  db: Db,
  sessionManager: SessionManager,
  cleanupService: CleanupService,
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
  app.decorate('cleanupService', cleanupService)

  await registerRoutes(app)

  // Global error handler — maps AppError → structured HTTP response
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError && err.isOperational) {
      return reply.code(err.statusCode).send({ error: err.message, code: err.code })
    }
    app.log.error({ err, url: req.url, method: req.method }, 'unhandled error')
    return reply.code(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' })
  })

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
