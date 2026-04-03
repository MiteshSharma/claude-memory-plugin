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

---

## What It Does For You

### Persistent Memory — Context Survives Across Sessions
Every tool Claude uses (file reads, edits, commands) is captured and processed by an AI observer. The observer distils each session into structured memory: what was built, what was investigated, what decisions were made, what's still pending. That memory is injected into your next session automatically.

### Smarter With Every Session
The more you use Claude Code, the smarter it gets about your project. Memory Updater builds a growing knowledge base of your codebase decisions, patterns, and history — making Claude progressively more useful over time rather than resetting to zero every day.

### Zero Friction
No workflow changes. No prompts to fill in. No manual summaries to write. Everything happens in the background through Claude Code's native hook system. You work exactly as you always have — Memory Updater handles the rest silently.

### Full-Text Search Over Your History
Every activity, session summary, and prompt is indexed with SQLite FTS5. Ask the MCP tool to find what you worked on: `search("rate limiting implementation")` — and get back the exact session, files touched, and decisions made.

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
          → Next SessionStart: context injected into system prompt
            → Claude walks in already knowing your project
```

**Data stays local.** Everything is stored in `~/.claude-plugin-kit/plugin.db` on your machine. Nothing is sent to any external service.

---

## Quick Start

```bash
# Install globally
npm install -g claude-plugin-kit

# Or one-liner
curl -fsSL https://raw.githubusercontent.com/your-org/claude-plugin-kit/main/scripts/install.sh | bash
```

Then restart Claude Code. That's it.

### Manual Install (from source)

```bash
git clone <repo-url> claude-memory-plugin
cd claude-memory-plugin
pnpm install
pnpm build:plugin
node bin/cli.js install
```

---

## CLI

```bash
claude-plugin-kit install    # Register hooks + MCP in ~/.claude/
claude-plugin-kit uninstall  # Remove hooks, MCP, stop server
claude-plugin-kit status     # Is the server running? Hooks registered?
claude-plugin-kit doctor     # Full diagnostic
claude-plugin-kit restart    # Restart the background server
```

---

## What Gets Injected

Each session start receives a context block like this in the system prompt:

```markdown
## my-project — Project Memory

47 activities across 12 sessions

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

---

## MCP Search Tool

Once installed, Claude Code gains a `search` tool:

```
search("rate limiting")           → finds all sessions where you implemented throttling
search("auth", project="api")     → scoped to a specific project
search("payment", type="sessions") → only session summaries
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PLUGIN_PORT` | `37799` | Server port |
| `PLUGIN_DATA_DIR` | `~/.claude-plugin-kit` | Where data is stored |
| `PLUGIN_AGENT_MODEL` | `haiku` | Claude model for AI Observer (`haiku` / `sonnet` / `opus`) |
| `PLUGIN_AGENT_DISABLED` | unset | Set `1` to disable the AI Observer (raw capture only) |
| `PLUGIN_LOG_LEVEL` | `info` | Log level (`info` / `debug` / `warn` / `error`) |

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

**Database** — SQLite at `~/.claude-plugin-kit/plugin.db` with WAL mode and FTS5 full-text search.

**AI Observer** — async background pipeline: captures tool events → processes via Claude Haiku → stores structured activities → FTS5 indexed.

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
| GET | `/api/context/inject` | Get injectable context (`?mode=minimal\|standard\|full`) |
| GET | `/api/context/token-economics` | ROI breakdown |
| GET | `/api/search` | Unified FTS5 search |
| GET | `/api/patterns` | Top recurring files and concepts |
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
