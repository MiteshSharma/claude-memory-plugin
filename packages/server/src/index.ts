import { createServer } from './server.js'
import { initDatabase } from './db/database.js'
import { SessionManager } from './agent/SessionManager.js'
import { CleanupService } from './services/CleanupService.js'
import { PORT, DATA_DIR } from './config.js'
import { setReady } from './lib/state.js'
import { logger } from './lib/logger.js'
import { mkdir, writeFile, readFile, rm } from 'fs/promises'
import path from 'path'

const PID_FILE = path.join(DATA_DIR, 'server.pid')

async function checkAndWritePid(): Promise<void> {
  try {
    const existing = await readFile(PID_FILE, 'utf8').catch(() => null)
    if (existing) {
      const pid = parseInt(existing.trim(), 10)
      if (!isNaN(pid) && pid !== process.pid) {
        try {
          process.kill(pid, 0) // throws ESRCH if process is gone
          logger.error({ pid }, 'another server instance is already running — exiting')
          process.exit(1)
        } catch {
          logger.warn({ pid }, 'stale PID file found — overwriting')
        }
      }
    }
  } catch { /* ignore read errors */ }

  await writeFile(PID_FILE, String(process.pid), 'utf8')
}

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await checkAndWritePid()

  const { db, raw } = initDatabase(path.join(DATA_DIR, 'plugin.db'))

  const sessionManager = new SessionManager(db)
  await sessionManager.start()

  const cleanupService = new CleanupService(db, raw)
  cleanupService.start()

  setReady()

  const server = await createServer(db, sessionManager, cleanupService)

  await server.listen({ port: PORT, host: '127.0.0.1' })

  server.log.info(`server ready at http://127.0.0.1:${PORT}`)
  server.log.info(`swagger docs  at http://127.0.0.1:${PORT}/docs`)
  server.log.info(`pid           : ${process.pid}`)

  const shutdown = async (): Promise<void> => {
    server.log.info('shutdown signal received — graceful shutdown (5s timeout)')

    // Force exit if cleanup hangs beyond 5 seconds
    const force = setTimeout(() => {
      server.log.error('graceful shutdown timed out — forcing exit')
      process.exit(1)
    }, 5_000)
    force.unref()

    try {
      cleanupService.stop()
      sessionManager.stop()
      await server.close()
      raw.close()
      await rm(PID_FILE, { force: true })
    } finally {
      clearTimeout(force)
      process.exit(0)
    }
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err: unknown) => {
  logger.error({ err }, '[server] fatal error')
  process.exit(1)
})
