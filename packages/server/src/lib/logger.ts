import pino from 'pino'
import { mkdirSync } from 'fs'
import path from 'path'
import { DATA_DIR, LOG_LEVEL, IS_DEV } from '../config.js'

// Ensure data directory exists before opening log file
try { mkdirSync(DATA_DIR, { recursive: true }) } catch { /* ignore */ }

const LOG_FILE = path.join(DATA_DIR, 'server.log')

/**
 * Shared structured logger for non-Fastify code (agent, services).
 * Dev: pretty-print to stdout.
 * Prod: JSON to stdout + JSON appended to ~/.claude-plugin-kit/server.log
 */
export const logger = IS_DEV
  ? pino({
      level: LOG_LEVEL,
      transport: { target: 'pino-pretty', options: { colorize: true } },
    })
  : pino(
      { level: LOG_LEVEL },
      pino.multistream([
        { stream: process.stdout },
        { stream: pino.destination({ dest: LOG_FILE, sync: false, append: true }) },
      ]),
    )
