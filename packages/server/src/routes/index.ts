import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { sessionRoutes } from './sessions.js'
import { activityRoutes } from './activities.js'
import { contextRoutes } from './context.js'
import { projectRoutes } from './projects.js'
import { adminRoutes } from './admin.js'
import { sseRoutes } from './sse.js'

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(sessionRoutes, { prefix: '/api/sessions' })
  await app.register(activityRoutes, { prefix: '/api/activities' })
  await app.register(contextRoutes, { prefix: '/api/context' })
  await app.register(projectRoutes, { prefix: '/api' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(sseRoutes, { prefix: '/api' })
}
