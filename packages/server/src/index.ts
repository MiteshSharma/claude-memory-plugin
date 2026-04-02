import { createServer } from './server.js'
import { initDatabase } from './db/database.js'
import { PORT, DATA_DIR } from './config.js'
import { mkdir } from 'fs/promises'
import path from 'path'

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })

  const db = initDatabase(path.join(DATA_DIR, 'plugin.db'))
  const server = await createServer(db)

  await server.listen({ port: PORT, host: '127.0.0.1' })

  server.log.info(`server ready at http://127.0.0.1:${PORT}`)
  server.log.info(`swagger docs  at http://127.0.0.1:${PORT}/docs`)
  server.log.info(`pid           : ${process.pid}`)

  const shutdown = async (): Promise<void> => {
    server.log.info('shutting down...')
    await server.close()
    db.close()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err: unknown) => {
  console.error('[server] fatal:', err)
  process.exit(1)
})
