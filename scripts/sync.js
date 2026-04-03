/**
 * Sync built plugin to ~/.claude/plugins/ and restart the server
 * Run: pnpm sync
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

const pluginDest = path.join(
  os.homedir(),
  '.claude/plugins/marketplaces/your-name/memory-updater',
)

if (!existsSync(pluginDest)) {
  console.log('[sync] plugin not installed — running install-plugin.js first')
  execSync('node scripts/install-plugin.js', { stdio: 'inherit' })
}

execSync(`rsync -av --delete plugin/ "${pluginDest}/"`, { stdio: 'inherit' })

// Restart the server if running
try {
  const res = await fetch('http://127.0.0.1:37799/api/admin/restart', { method: 'POST' })
  if (res.ok) console.log('[sync] server restarted')
} catch {
  console.log('[sync] server not running — will start on next Claude Code session')
}

console.log('[sync] done')
