import os from 'os'
import path from 'path'

export const PORT = parseInt(process.env['PLUGIN_PORT'] ?? '37799')
export const HOST = process.env['PLUGIN_HOST'] ?? '127.0.0.1'
export const DATA_DIR =
  process.env['PLUGIN_DATA_DIR'] ?? path.join(os.homedir(), '.claude-plugin-kit')
export const LOG_LEVEL = (process.env['PLUGIN_LOG_LEVEL'] ?? 'info') as
  | 'info'
  | 'debug'
  | 'warn'
  | 'error'
export const VERSION = process.env['npm_package_version'] ?? '0.1.0'
export const NODE_ENV = process.env['NODE_ENV'] ?? 'development'
export const IS_DEV = NODE_ENV === 'development'

// AI Agent config
export const ANTHROPIC_API_KEY = process.env['ANTHROPIC_API_KEY'] ?? ''
export const AGENT_MODEL = process.env['PLUGIN_AGENT_MODEL'] ?? 'claude-haiku-4-5-20251001'
export const AGENT_ENABLED = ANTHROPIC_API_KEY.length > 0
