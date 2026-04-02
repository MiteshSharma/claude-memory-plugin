import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const WORKER_URL = `http://127.0.0.1:${process.env['PLUGIN_PORT'] ?? '37799'}`

const server = new McpServer({
  name: 'claude-plugin-kit',
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

      const res = await fetch(`${WORKER_URL}/api/activities/search?${params.toString()}`, {
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        return { content: [{ type: 'text', text: 'Search service unavailable.' }] }
      }

      const data = (await res.json()) as { results?: unknown[] }
      const results = data.results ?? []

      return {
        content: [
          {
            type: 'text',
            text:
              results.length > 0
                ? JSON.stringify(results, null, 2)
                : `No results found for: "${query}"`,
          },
        ],
      }
    } catch {
      return { content: [{ type: 'text', text: 'Search service unavailable.' }] }
    }
  },
)

// ─── Tool: get_activities ────────────────────────────────────────────────────
server.registerTool(
  'get_activities',
  {
    description: 'Fetch full details for specific activities by ID',
    inputSchema: {
      ids: z.array(z.number()).describe('Array of activity IDs to fetch'),
      project: z.string().optional().describe('Project name for context'),
    },
  },
  async ({ ids, project }) => {
    console.error(
      `[mcp] get_activities: ids=${JSON.stringify(ids)} project="${project ?? ''}"`,
    )
    // Phase 1: stub — Phase 2 will implement full details from DB
    return {
      content: [
        {
          type: 'text',
          text: `Fetching activities ${ids.join(', ')} — Phase 2 will implement full details.`,
        },
      ],
    }
  },
)

// ─── Tool: timeline ───────────────────────────────────────────────────────────
server.registerTool(
  'timeline',
  {
    description: 'Get context timeline around an activity or query',
    inputSchema: {
      anchor: z.number().optional().describe('Activity ID to center on'),
      query: z.string().optional().describe('Query to find anchor automatically'),
      depth_before: z.number().optional().default(5).describe('Events before anchor'),
      depth_after: z.number().optional().default(5).describe('Events after anchor'),
      project: z.string().optional().describe('Filter by project'),
    },
  },
  async ({ anchor, query, depth_before, depth_after, project }) => {
    console.error(
      `[mcp] timeline: anchor=${anchor ?? 'none'} query="${query ?? ''}" project="${project ?? ''}" before=${depth_before ?? 5} after=${depth_after ?? 5}`,
    )
    // Phase 1: stub — Phase 4 will implement full timeline
    return {
      content: [
        {
          type: 'text',
          text: `Timeline around ${anchor != null ? `#${anchor}` : `"${query}"`} — Phase 4 will implement full timeline.`,
        },
      ],
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
