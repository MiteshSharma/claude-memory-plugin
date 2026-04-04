import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const WORKER_URL = `http://127.0.0.1:${process.env['PLUGIN_PORT'] ?? '37799'}`

const server = new McpServer({
  name: 'memory-updater',
  version: '0.1.0',
})

// ─── Tool: search ─────────────────────────────────────────────────────────────
server.registerTool(
  'search',
  {
    description: 'Search past activities and session summaries',
    inputSchema: {
      query: z.string().describe('Search query'),
      project: z.string().optional().describe('Filter by project name'),
      limit: z.number().optional().default(20).describe('Max results (1-100)'),
      type: z.enum(['activities', 'sessions', 'all']).optional().default('all'),
    },
  },
  async ({ query, project, limit, type }) => {
    console.error(`[mcp] search: query="${query}" project="${project ?? ''}" type="${type ?? 'all'}"`)

    try {
      const params = new URLSearchParams({
        query,
        limit: String(limit ?? 20),
        type: type ?? 'all',
      })
      if (project) params.set('project', project)

      const res = await fetch(`${WORKER_URL}/api/search?${params.toString()}`, {
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        return { content: [{ type: 'text' as const, text: 'Search service unavailable.' }] }
      }

      const data = (await res.json()) as { results?: unknown[] }
      const results = data.results ?? []

      return {
        content: [
          {
            type: 'text' as const,
            text:
              results.length > 0
                ? JSON.stringify(results, null, 2)
                : `No results found for: "${query}"`,
          },
        ],
      }
    } catch {
      return { content: [{ type: 'text' as const, text: 'Search service unavailable.' }] }
    }
  },
)

// ─── Tool: get_learnings ──────────────────────────────────────────────────────
server.registerTool(
  'get_learnings',
  {
    description: 'Get coding practices and patterns observed across all projects',
    inputSchema: {
      topic: z.string().optional().describe('Filter by topic (e.g., "go", "testing", "react")'),
      category: z.enum(['coding', 'tooling', 'architecture', 'debugging', 'review', 'workflow']).optional(),
      limit: z.number().optional().default(10).describe('Max results (1-50)'),
    },
  },
  async ({ topic, category, limit }) => {
    console.error(`[mcp] get_learnings: topic="${topic ?? ''}" category="${category ?? ''}"`)

    try {
      const params = new URLSearchParams({ limit: String(limit ?? 10) })
      if (topic) params.set('topic', topic)
      if (category) params.set('category', category)

      const res = await fetch(`${WORKER_URL}/api/learnings?${params.toString()}`, {
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        return { content: [{ type: 'text' as const, text: 'Learnings service unavailable.' }] }
      }

      const data = (await res.json()) as { learnings?: unknown[] }
      const learnings = data.learnings ?? []

      return {
        content: [
          {
            type: 'text' as const,
            text:
              learnings.length > 0
                ? JSON.stringify(learnings, null, 2)
                : 'No learnings found.' + (topic ? ` Try a different topic than "${topic}".` : ''),
          },
        ],
      }
    } catch {
      return { content: [{ type: 'text' as const, text: 'Learnings service unavailable.' }] }
    }
  },
)

// Start the MCP server on stdio
async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[mcp] server running on stdio')
}

main().catch((err: unknown) => {
  console.error('[mcp] fatal:', err)
  process.exit(1)
})
