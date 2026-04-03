import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { sessionRoutes } from './sessions.js'
import { activityRoutes } from './activities.js'
import { contextRoutes } from './context.js'
import { projectRoutes } from './projects.js'
import { searchRoutes } from './search.js'
import { adminRoutes } from './admin.js'
import { sseRoutes } from './sse.js'
import { rawEventRoutes } from './raw-events.js'
import { queueRoutes } from './queue.js'
import { promptRoutes } from './prompts.js'
import { patternRoutes } from './patterns.js'

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(sessionRoutes, { prefix: '/api/sessions' })
  await app.register(activityRoutes, { prefix: '/api/activities' })
  await app.register(contextRoutes, { prefix: '/api/context' })
  await app.register(projectRoutes, { prefix: '/api' })
  await app.register(searchRoutes, { prefix: '/api/search' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(sseRoutes, { prefix: '/api' })
  await app.register(rawEventRoutes, { prefix: '/api/raw-events' })
  await app.register(queueRoutes, { prefix: '/api/queue' })
  await app.register(promptRoutes, { prefix: '/api/prompts' })
  await app.register(patternRoutes, { prefix: '/api/patterns' })
}
