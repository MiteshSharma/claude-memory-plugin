import { ensureWorkerRunning, workerPost } from './shared/worker.js'
import { readHookInput } from './shared/stdin.js'

async function main(): Promise<void> {
  const input = readHookInput()
  const sessionId = input.session_id
  const workDir = input.cwd ?? process.cwd()

  if (!sessionId) {
    process.exit(0)
  }

  const running = await ensureWorkerRunning()
  if (!running) {
    process.exit(0)
  }

  // Fire summarize + complete in parallel — both are fire-and-forget
  await Promise.allSettled([
    workerPost('/api/sessions/summarize', {
      sessionId,
      workDir,
    }),
    workerPost('/api/sessions/complete', { sessionId }),
  ])

  process.exit(0)
}

main().catch(() => process.exit(0))
