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

  // Touch to keep session alive + enqueue summarize — both fire-and-forget
  // Session remains active; stale sweeper marks it complete after inactivity
  await Promise.allSettled([
    workerPost('/api/sessions/touch', { sessionId }),
    workerPost('/api/sessions/summarize', { sessionId, workDir }),
  ])

  process.exit(0)
}

main().catch(() => process.exit(0))
