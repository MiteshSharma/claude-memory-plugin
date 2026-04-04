# Memory Updater

> Claude Code, but it actually remembers you.

Claude Code is powerful — but every session starts from zero. No memory of what you built yesterday. No awareness of decisions made last week. No continuity across your work.

**Memory Updater** fixes that. It silently observes every session, extracts what matters, and injects it back the next time you open Claude Code — so your AI pair programmer walks in already knowing your codebase, your decisions, and where you left off.

---

## Why This Exists

| Without Memory Updater | With Memory Updater |
|------------------------|---------------------|
| Re-explain your stack every session | Claude already knows your stack |
| Re-describe what you built last week | Claude knows what was completed |
| Repeat context about in-progress work | Claude picks up exactly where you left off |
| Waste tokens on orientation | Spend tokens on actual work |
| Claude makes decisions you already reversed | Claude remembers your decisions |
| "Use table-driven tests" — every Go project | Claude already knows you prefer table-driven tests |
| Coding style forgotten across projects | Your practices follow you everywhere |

---

## What It Does For You

### Persistent Memory — Context Survives Across Sessions
Every tool Claude uses (file reads, edits, commands) is captured and processed by an AI observer. The observer distils each session into structured memory: what was built, what was investigated, what decisions were made, what's still pending. That memory is injected into your next session automatically.

### Smarter With Every Session
The more you use Claude Code, the smarter it gets about your project. Memory Updater builds a growing knowledge base of your codebase decisions, patterns, and history — making Claude progressively more useful over time rather than resetting to zero every day.

### Zero Friction
No workflow changes. No prompts to fill in. No manual summaries to write. Everything happens in the background through Claude Code's native hook system. You work exactly as you always have — Memory Updater handles the rest silently.

### Global Learning — Your Coding DNA
Memory Updater doesn't just remember what you did — it learns **how you work**. Every session summary is analysed for reusable patterns, preferences, and practices that apply across all your projects. These learnings accumulate with confidence scores and are automatically injected into future sessions based on tech stack relevance.

Start a Go project? Claude already knows you prefer table-driven tests, check for race conditions in reviews, and use the repository pattern. Switch to a TypeScript project? It knows you use Zod as single source of truth, pnpm workspaces, and esbuild for bundling.

Learnings are **permanent** — they persist forever, gaining confidence each time the same pattern is re-observed. Project-specific data expires (30-90 days), but your coding DNA stays.

You're not limited to auto-extracted learnings — **add your own** from the dashboard. Click "Add Learning", describe the practice, pick a category, set a confidence score, and it gets injected into every relevant session. You can also **archive** learnings to stop injection without deleting, or **delete** them permanently. Full control over what Claude knows about how you work.

### Full-Text Search Over Your History
Every activity, session summary, and prompt is indexed with SQLite FTS5. Ask the MCP tool to find what you worked on: `search("rate limiting implementation")` — and get back the exact session, files touched, and decisions made.

### Self-Managing Database
Memory Updater automatically manages its own data lifecycle. Raw events expire after 7 days, activities after 30 days, session summaries after 90 days — but before any summary is deleted, its patterns are promoted to permanent global learnings. The database stays lean without losing knowledge.

### Token Economics — ROI You Can Measure
The context injected at session start is worth more than it costs. Memory Updater tracks tokens spent generating memory vs. tokens read back, and shows you the ROI. Typical sessions run 3–5× return — you get compressed, pre-reasoned history at a fraction of the token cost of re-establishing context manually.

---

## How It Works

```
Your session
  → PostToolUse hook captures every tool call
    → AI Observer (Claude Haiku) extracts structured activities
      → Activities stored in local SQLite + FTS5 index
        → On Stop: session summarised (request → investigation → outcome)
          → Learning Extractor distils cross-project patterns with canonical keys
            → Learnings deduplicated and confidence scores updated
              → Next SessionStart: context + learnings injected into system prompt
                → Claude walks in knowing your project AND your practices

Data lifecycle:
  raw_events (7d) → activities (30d) → summaries (90d) → global_learnings (forever)
                                                               ↑
                                                 promoted before expiry
```

**Data stays local.** Everything is stored in `~/.memory-updater/plugin.db` on your machine. Nothing is sent to any external service.

---

## Quick Start

### Install from Source

```bash
git clone <repo-url> claude-memory-plugin
cd claude-memory-plugin
pnpm install
pnpm build:plugin
node bin/cli.js install
```

### Running Server + UI (from root folder)

```bash
# Development — starts both server and UI with hot reload
pnpm dev
# → Server:  http://127.0.0.1:37799      (API + Swagger docs)
# → UI:      http://127.0.0.1:3100        (Vite dev server, proxies /api)

# Start server only
pnpm dev:server

# Start UI only
pnpm dev:ui

# Production — serve built plugin (server + bundled UI)
pnpm start
# → http://127.0.0.1:37799  (API + UI served from same port)
```

---

## What Gets Injected

Each session start receives a context block like this in the system prompt:

```markdown
## my-project — Project Memory

47 activities across 12 sessions

### Your Practices
> Patterns observed across your projects

**coding**
- Uses Zod schemas as single source of truth for validation and types (3.5)
- Prefers repository pattern for database access with thin service layer (2.8)

**tooling**
- Uses pnpm over npm for all Node.js projects with workspace support (3.0)

**architecture**
- Favors event-driven async processing with queue-based workers (2.3)

### Previously
- Apr 1: Added auth middleware → JWT validation complete
- Apr 2: Fixed DB connection pool leak → Resolved, pool capped at 10
- Apr 3: Phase 7 production hardening → AppError, pino logger, PID file, graceful shutdown

### Latest Session
**Request**: Implement Phase 7 production hardening
**Investigated**: Fastify error handler patterns, pino multistream for log rotation
**Insights**: force-exit timer must use .unref() to avoid blocking event loop
**Completed**: AppError, global error handler, 10KB payload cap, readiness probe
**Pending**: pino-roll for log rotation

### Recent Activity

**Thu, Apr 3**
- [edit] packages/server/src/lib/errors.ts — AppError with statusCode, code, isOperational
- [edit] packages/server/src/lib/logger.ts — pino multistream: stdout + server.log
- [edit] packages/server/src/index.ts — PID file, stale detection, 5s graceful shutdown

---
*47 activities · ~890 read tokens · 3.8× ROI*
```

The **Your Practices** section is auto-generated from global learnings. Only learnings with confidence >= 1.5 are injected, filtered by tech stack detected from your working directory. The section is capped at ~500 tokens to avoid bloating context.

---

## MCP Tools

Once installed, Claude Code gains two tools:

### search — Find past work
```
search("rate limiting")           → finds all sessions where you implemented throttling
search("auth", project="api")     → scoped to a specific project
search("payment", type="sessions") → only session summaries
```

### get_learnings — Query your coding practices
```
get_learnings(topic="go")               → your Go-specific patterns and practices
get_learnings(category="architecture")  → architectural decisions you consistently make
get_learnings(topic="testing", limit=5) → your testing patterns
```

Returns learnings with confidence scores, evidence counts, and topic tags. Use this to ask Claude about your own coding habits across all projects.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PLUGIN_PORT` | `37799` | Server port |
| `PLUGIN_DATA_DIR` | `~/.memory-updater` | Where data is stored |
| `PLUGIN_AGENT_MODEL` | `haiku` | Claude model for AI Observer (`haiku` / `sonnet` / `opus`) |
| `PLUGIN_AGENT_DISABLED` | unset | Set `1` to disable the AI Observer (raw capture only) |
| `PLUGIN_LOG_LEVEL` | `info` | Log level (`info` / `debug` / `warn` / `error`) |

### Retention Policy

Data is automatically cleaned up on a schedule. Summaries are promoted to global learnings before deletion — no knowledge is lost.

| Variable | Default | Description |
|----------|---------|-------------|
| `PLUGIN_RETENTION_RAW_EVENTS_DAYS` | `7` | Raw event intake buffer TTL |
| `PLUGIN_RETENTION_PENDING_DAYS` | `3` | Processing queue item TTL |
| `PLUGIN_RETENTION_ACTIVITIES_DAYS` | `30` | AI-processed activities TTL |
| `PLUGIN_RETENTION_PROMPTS_DAYS` | `30` | User prompts TTL |
| `PLUGIN_RETENTION_SESSIONS_DAYS` | `30` | Session metadata TTL |
| `PLUGIN_RETENTION_SUMMARIES_DAYS` | `90` | Session summaries TTL |
| `PLUGIN_RETENTION_CLEANUP_HOURS` | `24` | How often cleanup runs |
| `PLUGIN_RETENTION_DECAY_MONTHS` | `6` | Months before learning confidence decays |

Global learnings are **never deleted** — they persist forever. Stale learnings (not re-observed in 6 months) have their confidence reduced; below 0.5 they are auto-archived.

---

## Context Injection Modes

Control how much context is injected per session:

| Mode | Activities | Summaries | Best For |
|------|-----------|-----------|----------|
| `minimal` | 0 | 0 | Minimal token overhead |
| `standard` | up to 50 | up to 3 | Daily use (default) |
| `full` | up to 200 | up to 3 | Deep dives into long-running projects |

Set via: `GET /api/context/inject?mode=full`

---

## Architecture

```
packages/
  shared/     Zod schemas — single source of truth for all API contracts
  server/     Fastify 5 server: routes → services → repositories
  hooks/      5 Claude Code hook scripts
  mcp/        MCP server exposing the search tool
  ui/         React 19 + Vite session timeline viewer

plugin/       Built distributable (committed to git — no build step needed)
  scripts/    server.cjs, mcp-server.cjs, hook .js files
```

**Server** runs at `http://127.0.0.1:37799` (localhost only). Swagger docs at `/docs`.

**Database** — SQLite at `~/.memory-updater/plugin.db` with WAL mode and FTS5 full-text search.

**AI Observer** — async background pipeline: captures tool events → processes via Claude Haiku → stores structured activities → FTS5 indexed.

**Learning Extractor** — after each session summary, distils cross-project coding patterns with canonical keys for deduplication. Learnings accumulate confidence on re-observation and are injected based on tech stack relevance.

**Cleanup Service** — runs every 24 hours, deletes expired data in dependency order, promotes expiring summaries to learnings before deletion, and vacuums the database.

---

## API Reference

Server binds to `127.0.0.1:37799`. Full docs at `http://127.0.0.1:37799/docs`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/readiness` | Readiness probe (503 until fully initialised) |
| GET | `/api/stats` | Session + activity counts |
| POST | `/api/sessions/init` | Create or resume a session |
| POST | `/api/sessions/summarize` | Enqueue session summarization |
| GET | `/api/sessions` | List sessions with latest summary |
| GET | `/api/sessions/:id/timeline` | Chronological prompts + activities |
| POST | `/api/activities` | Store a tool activity |
| GET | `/api/context/inject` | Get injectable context (`?mode=minimal\|standard\|full&workDir=...`) |
| GET | `/api/context/token-economics` | ROI breakdown |
| GET | `/api/search` | Unified FTS5 search |
| GET | `/api/patterns` | Top recurring files and concepts |
| GET | `/api/learnings` | List global learnings (`?topic=go&category=coding`) |
| GET | `/api/learnings/stats` | Learning stats by category |
| DELETE | `/api/learnings/:id` | Delete a learning |
| POST | `/api/learnings/:id/archive` | Soft-archive a learning |
| POST | `/api/learnings/decay` | Trigger confidence decay for stale learnings |
| GET | `/api/admin/retention` | Retention stats per table |
| POST | `/api/admin/retention/cleanup` | Trigger manual cleanup |
| GET | `/api/admin/retention/config` | Current retention TTL config |
| GET | `/api/queue` | AI processing queue status |
| GET | `/api/stream` | SSE for real-time viewer |


---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Server | Fastify 5 + Zod |
| ORM | Drizzle ORM |
| Database | better-sqlite3 (WAL + FTS5) |
| AI Observer | Claude Haiku via CLI subprocess |
| MCP | @modelcontextprotocol/sdk |
| Build | esbuild + Turborepo |
| UI | React 19 + Vite + Ant Design |

---

## License

MIT
