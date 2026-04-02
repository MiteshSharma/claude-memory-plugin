/**
 * Method 3: MCP-only install (lightweight, no hooks)
 * Run: node scripts/register-mcp.js
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const mcpScript = path.join(root, 'plugin/scripts/mcp-server.cjs')
const mcpPath = path.join(os.homedir(), '.claude/mcp.json')

mkdirSync(path.join(os.homedir(), '.claude'), { recursive: true })

let mcp = { mcpServers: {} }
if (existsSync(mcpPath)) {
  try {
    mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
  } catch {
    /* ignore */
  }
}

mcp.mcpServers ??= {}
mcp.mcpServers['claude-plugin-kit'] = {
  command: process.execPath,
  args: [mcpScript],
  env: { PLUGIN_PORT: '37799' },
}

writeFileSync(mcpPath, JSON.stringify(mcp, null, 2) + '\n')
console.log(`[mcp] registered in ${mcpPath}`)
console.log('[mcp] Restart Claude Code, then use search/get_activities/timeline MCP tools.')
