# Claude Plugin Kit

Persistent memory and context injection plugin for Claude Code.

## Stack
- Runtime: Node.js 22 (Bun 1.x optional)
- Backend: Fastify 5 + Zod + fastify-type-provider-zod
- DB: better-sqlite3 (WAL mode)
- Monorepo: pnpm workspaces + Turborepo
- Build: esbuild

## Commands

```bash
pnpm install          # Install all dependencies
pnpm build:plugin     # Build all packages → plugin/scripts/
node scripts/register-hooks.js    # Method 2: register hooks manually
node scripts/register-mcp.js      # Method 3: MCP-only install
```

## Development

```bash
# Start server (dev mode)
cd packages/server && pnpm dev
# → http://127.0.0.1:37799
# → http://127.0.0.1:37799/docs (Swagger UI)

# Build all packages
pnpm build:plugin
```

## Architecture

```
packages/shared/     ← Zod v3 schemas (single source of truth for all contracts)
packages/server/     ← Fastify server: routes → services → repositories
packages/hooks/      ← 5 Claude Code hook scripts (SessionStart, UserPromptSubmit, PostToolUse, Stop, UserMessage)
packages/mcp/        ← MCP server: search, get_activities, timeline tools
plugin/              ← Built distributable output
  scripts/           ← server.cjs, mcp-server.cjs, hook .js files
  hooks/hooks.json   ← Claude Code hook registrations
  .mcp.json          ← MCP server registration
scripts/             ← Build + install scripts
```

## Key Design Decisions

1. **All Zod schemas in packages/shared** — never define schemas in route files
2. **Thin controllers** — routes only: declare schema + call service + set status code
3. **better-sqlite3** has native bindings; `npm rebuild better-sqlite3` after fresh install
4. **Hooks always exit 0** — graceful degradation, never block Claude Code
5. **Phase 1 stubs** — ContextService, ActivityService.search(), SummarizeService return empty data

## API

Server runs at `http://127.0.0.1:37799`. Full interactive docs at `/docs`.

Key Phase 1 endpoints:
- `GET  /api/health`            — liveness probe
- `POST /api/sessions/init`     — called by UserPromptSubmit hook
- `POST /api/activities`         — called by PostToolUse hook
- `GET  /api/context/inject`    — called by SessionStart hook
- `POST /api/sessions/complete` — called by Stop hook
- `GET  /api/stream`            — SSE for React viewer (Phase 6)

## Phases

1. ✅ Basic Framework (current)
2. Data Layer — Drizzle ORM, complete schema
3. AI Observer Agent — Claude Agent SDK, async queue
4. Context System — session summaries, memory injection
5. Search — SQLite FTS5 + Chroma vector
6. React Viewer UI
7. Production Hardening
8. Testing
9. Distribution
