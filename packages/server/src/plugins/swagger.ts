import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'
import { VERSION } from '../config.js'

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  // Tell Fastify to use Zod for validation and serialization
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // jsonSchemaTransform converts Zod schemas to OpenAPI JSON Schema
  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Claude Plugin Kit API',
        description: 'Persistent memory and context injection for Claude Code',
        version: VERSION,
      },
      tags: [
        { name: 'Health', description: 'System health and diagnostics' },
        { name: 'Sessions', description: 'Claude Code session lifecycle' },
        { name: 'Activities', description: 'Tool usage activity storage' },
        { name: 'Context', description: 'Memory context injection' },
        { name: 'Projects', description: 'Project management' },
        { name: 'Search', description: 'Full-text search across activities, summaries, and prompts' },
        { name: 'Admin', description: 'Server administration (localhost only)' },
      ],
      servers: [{ url: 'http://127.0.0.1:37799', description: 'Local server' }],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    logo: { type: 'text/html', content: '' },
  })
}
