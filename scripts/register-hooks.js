/**
 * Method 2: Register hooks manually in ~/.claude/settings.json
 * Run: node scripts/register-hooks.js
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pluginRoot = path.join(root, 'plugin')
const settingsPath = path.join(os.homedir(), '.claude/settings.json')
const scriptsDir = path.join(pluginRoot, 'scripts')

mkdirSync(path.join(os.homedir(), '.claude'), { recursive: true })

let settings = {}
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  } catch {
    console.warn('[register] could not parse existing settings.json — starting fresh')
  }
}

const nodeExe = process.execPath

const hookEntry = (script, timeout = 30000) => ({
  command: `"${nodeExe}" "${path.join(scriptsDir, script)}"`,
  timeout,
})

settings.hooks = settings.hooks ?? {}
settings.hooks.SessionStart = [hookEntry('session-start.js', 10000), hookEntry('user-message.js', 5000)]
settings.hooks.UserPromptSubmit = [hookEntry('user-prompt-submit.js', 10000)]
settings.hooks.PostToolUse = [hookEntry('post-tool-use.js', 120000)]
settings.hooks.Stop = [hookEntry('stop.js', 60000)]

writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
console.log(`[register] hooks written to ${settingsPath}`)

// Also register MCP server
const mcpPath = path.join(os.homedir(), '.claude/mcp.json')
let mcp = { mcpServers: {} }
if (existsSync(mcpPath)) {
  try {
    mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
  } catch {
    /* ignore */
  }
}
mcp.mcpServers ??= {}
mcp.mcpServers['memory-updater'] = {
  command: nodeExe,
  args: [path.join(scriptsDir, 'mcp-server.cjs')],
  env: { PLUGIN_PORT: '37799' },
}
writeFileSync(mcpPath, JSON.stringify(mcp, null, 2) + '\n')
console.log(`[register] MCP server written to ${mcpPath}`)
console.log('[register] ✓ Restart Claude Code to activate hooks and MCP tools.')
