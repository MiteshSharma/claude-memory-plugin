/**
 * Method 1: Plugin install (copies plugin/ to ~/.claude/plugins/)
 * Run: node scripts/install-plugin.js
 */
import { cpSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pluginDest = path.join(
  os.homedir(),
  '.claude/plugins/marketplaces/your-name/claude-plugin-kit',
)

console.log('[install] installing claude-plugin-kit...')
console.log(`[install] destination: ${pluginDest}`)

mkdirSync(pluginDest, { recursive: true })
cpSync(path.join(root, 'plugin'), pluginDest, { recursive: true })

console.log('\n[install] done!')
console.log('[install] Restart Claude Code to activate the plugin.')
console.log('[install] Viewer available at http://127.0.0.1:37799 after first session.')
