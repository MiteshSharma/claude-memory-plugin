#!/usr/bin/env node
/**
 * memory-updater CLI
 * Commands: install | uninstall | status | doctor | restart
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { execSync, execFileSync } from 'child_process'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT   = path.join(__dirname, '..')
const SCRIPTS    = path.join(PKG_ROOT, 'plugin/scripts')
const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const SETTINGS   = path.join(CLAUDE_DIR, 'settings.json')
const MCP_JSON   = path.join(CLAUDE_DIR, 'mcp.json')
const PORT       = process.env['PLUGIN_PORT'] ?? '37799'
const BASE_URL   = `http://127.0.0.1:${PORT}`
const NODE       = process.execPath

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson(file) {
  if (!existsSync(file)) return {}
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return {} }
}

function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

function ok(msg)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`) }
function warn(msg) { console.log(`  \x1b[33m!\x1b[0m ${msg}`) }
function fail(msg) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`) }
function info(msg) { console.log(`  ${msg}`) }

async function fetch_(url) {
  const { default: fetch } = await import('node:http').then(() => ({ default: null }))
    .catch(() => ({}))
  // Use built-in fetch (Node 22)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return res
  } catch {
    return null
  }
}

async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

function hookEntry(script, timeout = 30000) {
  return { command: `"${NODE}" "${path.join(SCRIPTS, script)}"`, timeout }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdInstall() {
  console.log('\n  Installing memory-updater...\n')

  if (!existsSync(SCRIPTS)) {
    fail('plugin/scripts not found — run: pnpm build:plugin')
    process.exit(1)
  }

  // Register hooks in ~/.claude/settings.json
  const settings = readJson(SETTINGS)
  settings.hooks ??= {}
  settings.hooks.SessionStart     = [hookEntry('session-start.js', 10000), hookEntry('user-message.js', 5000)]
  settings.hooks.UserPromptSubmit = [hookEntry('user-prompt-submit.js', 10000)]
  settings.hooks.PostToolUse      = [hookEntry('post-tool-use.js', 120000)]
  settings.hooks.Stop             = [hookEntry('stop.js', 60000)]
  writeJson(SETTINGS, settings)
  ok(`hooks registered in ${SETTINGS}`)

  // Register MCP server in ~/.claude/mcp.json
  const mcp = readJson(MCP_JSON)
  mcp.mcpServers ??= {}
  mcp.mcpServers['memory-updater'] = {
    command: NODE,
    args: [path.join(SCRIPTS, 'mcp-server.cjs')],
    env: { PLUGIN_PORT: PORT },
  }
  writeJson(MCP_JSON, mcp)
  ok(`MCP server registered in ${MCP_JSON}`)

  console.log('\n  Restart Claude Code to activate.\n')
}

function cmdUninstall() {
  console.log('\n  Uninstalling memory-updater...\n')

  // Remove hooks
  const settings = readJson(SETTINGS)
  if (settings.hooks) {
    const hookKeys = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']
    for (const key of hookKeys) {
      if (!Array.isArray(settings.hooks[key])) continue
      settings.hooks[key] = settings.hooks[key].filter(
        (h) => !String(h.command ?? '').includes('memory-updater')
          && !String(h.command ?? '').includes(SCRIPTS)
      )
      if (settings.hooks[key].length === 0) delete settings.hooks[key]
    }
    writeJson(SETTINGS, settings)
    ok('hooks removed from settings.json')
  }

  // Remove MCP entry
  const mcp = readJson(MCP_JSON)
  if (mcp.mcpServers?.['memory-updater']) {
    delete mcp.mcpServers['memory-updater']
    writeJson(MCP_JSON, mcp)
    ok('MCP server removed from mcp.json')
  }

  // Kill server if running
  try {
    execFileSync(NODE, ['-e', `
      fetch('${BASE_URL}/api/admin/shutdown', { method: 'POST' }).catch(() => {})
    `], { timeout: 3000 })
    ok('server stopped')
  } catch { /* already down */ }

  console.log('\n  Restart Claude Code to complete uninstall.\n')
}

async function cmdStatus() {
  console.log('\n  memory-updater status\n')

  // Server
  const running = await isServerRunning()
  if (running) {
    ok(`server running at ${BASE_URL}`)
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      info(`  version=${data.version}  uptime=${Math.round(data.uptime)}s  db=${data.db ? 'ok' : 'degraded'}`)
    } catch { /* ignore */ }
  } else {
    fail(`server not running (${BASE_URL})`)
  }

  // Hooks
  const settings = readJson(SETTINGS)
  const hooksInstalled = settings.hooks?.SessionStart?.some(
    (h) => String(h.command ?? '').includes(SCRIPTS)
  )
  hooksInstalled ? ok('hooks registered') : fail('hooks not registered — run: memory-updater install')

  // MCP
  const mcp = readJson(MCP_JSON)
  mcp.mcpServers?.['memory-updater']
    ? ok('MCP server registered')
    : fail('MCP server not registered — run: memory-updater install')

  console.log()
}

async function cmdDoctor() {
  console.log('\n  memory-updater doctor\n')

  // Node version
  const nodeVer = process.versions.node
  const [major] = nodeVer.split('.').map(Number)
  major >= 22 ? ok(`Node.js v${nodeVer}`) : warn(`Node.js v${nodeVer} — v22+ recommended`)

  // plugin/scripts exists
  existsSync(SCRIPTS)
    ? ok(`plugin/scripts found at ${SCRIPTS}`)
    : fail(`plugin/scripts missing — run: pnpm build:plugin`)

  // Port available / server check
  const running = await isServerRunning()
  running
    ? ok(`server responding at ${BASE_URL}`)
    : warn(`server not responding at ${BASE_URL} — it will auto-start on next SessionStart hook`)

  // Readiness
  if (running) {
    try {
      const res = await fetch(`${BASE_URL}/api/readiness`, { signal: AbortSignal.timeout(3000) })
      res.ok ? ok('server ready') : warn('server starting (readiness probe returned 503)')
    } catch { warn('could not reach readiness endpoint') }
  }

  // settings.json hooks
  const settings = readJson(SETTINGS)
  const hooks = settings.hooks ?? {}
  const expectedEvents = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']
  for (const ev of expectedEvents) {
    const entries = hooks[ev] ?? []
    const found = entries.some((h) => String(h.command ?? '').includes('memory-updater')
      || String(h.command ?? '').includes(SCRIPTS))
    found ? ok(`hook: ${ev}`) : fail(`hook missing: ${ev}`)
  }

  // MCP
  const mcp = readJson(MCP_JSON)
  mcp.mcpServers?.['memory-updater']
    ? ok('MCP server registered')
    : fail('MCP server not registered')

  console.log()
}

async function cmdRestart() {
  console.log('\n  Restarting server...\n')
  try {
    const res = await fetch(`${BASE_URL}/api/admin/restart`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    })
    res.ok ? ok('restart signal sent') : fail(`server returned ${res.status}`)
  } catch {
    fail(`could not reach server at ${BASE_URL}`)
  }
  console.log()
}

// ─── Entry ────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv

const pkg = readJson(path.join(PKG_ROOT, 'package.json'))
console.log(`\x1b[1m  memory-updater\x1b[0m v${pkg.version ?? ''}`)

switch (cmd) {
  case 'install':   cmdInstall();         break
  case 'uninstall': cmdUninstall();       break
  case 'status':    await cmdStatus();    break
  case 'doctor':    await cmdDoctor();    break
  case 'restart':   await cmdRestart();   break
  default:
    console.log(`
  Usage: memory-updater <command>

  Commands:
    install    Register hooks and MCP server in ~/.claude/
    uninstall  Remove hooks and MCP server, stop server
    status     Show server, hooks, and MCP registration status
    doctor     Full diagnostic (Node version, port, hooks, MCP)
    restart    Send restart signal to the running server
`)
}
