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

// Retention policy (days)
export const RETENTION = {
  RAW_EVENTS_DAYS: parseInt(process.env['PLUGIN_RETENTION_RAW_EVENTS_DAYS'] ?? '7', 10),
  PENDING_MESSAGES_DAYS: parseInt(process.env['PLUGIN_RETENTION_PENDING_DAYS'] ?? '3', 10),
  ACTIVITIES_DAYS: parseInt(process.env['PLUGIN_RETENTION_ACTIVITIES_DAYS'] ?? '30', 10),
  PROMPTS_DAYS: parseInt(process.env['PLUGIN_RETENTION_PROMPTS_DAYS'] ?? '30', 10),
  SESSIONS_DAYS: parseInt(process.env['PLUGIN_RETENTION_SESSIONS_DAYS'] ?? '30', 10),
  SUMMARIES_DAYS: parseInt(process.env['PLUGIN_RETENTION_SUMMARIES_DAYS'] ?? '90', 10),
  CLEANUP_INTERVAL_HOURS: parseInt(process.env['PLUGIN_RETENTION_CLEANUP_HOURS'] ?? '24', 10),
  LEARNING_DECAY_MONTHS: parseInt(process.env['PLUGIN_RETENTION_DECAY_MONTHS'] ?? '6', 10),
}
