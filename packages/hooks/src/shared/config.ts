import os from 'os'
import path from 'path'

export const WORKER_PORT = parseInt(process.env['PLUGIN_PORT'] ?? '37799')
export const WORKER_HOST = process.env['PLUGIN_HOST'] ?? '127.0.0.1'
export const DATA_DIR =
  process.env['PLUGIN_DATA_DIR'] ?? path.join(os.homedir(), '.claude-plugin-kit')
export const WORKER_URL = `http://${WORKER_HOST}:${WORKER_PORT}`
export const PLUGIN_ROOT =
  process.env['CLAUDE_PLUGIN_ROOT'] ??
  path.join(
    os.homedir(),
    '.claude/plugins/marketplaces/your-name/claude-plugin-kit/plugin',
  )
export const HEALTH_TIMEOUT = 2_000
export const API_TIMEOUT = 30_000
