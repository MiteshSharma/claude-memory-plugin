import os from 'os'
import path from 'path'

export const PORT = parseInt(process.env['PLUGIN_PORT'] ?? '37799')
export const HOST = process.env['PLUGIN_HOST'] ?? '127.0.0.1'
export const DATA_DIR =
  process.env['PLUGIN_DATA_DIR'] ?? path.join(os.homedir(), '.memory-updater')
export const LOG_LEVEL = (process.env['PLUGIN_LOG_LEVEL'] ?? 'info') as
  | 'info'
  | 'debug'
  | 'warn'
  | 'error'
export const VERSION = process.env['npm_package_version'] ?? '0.1.0'
export const NODE_ENV = process.env['NODE_ENV'] ?? 'production'
export const IS_DEV = NODE_ENV === 'development'

// AI Agent config
export const CLAUDE_CLI_PATH = process.env['CLAUDE_CLI_PATH'] ?? 'claude'
export const AGENT_MODEL = process.env['PLUGIN_AGENT_MODEL'] ?? 'haiku'
export const AGENT_ENABLED = process.env['PLUGIN_AGENT_DISABLED'] !== '1'
