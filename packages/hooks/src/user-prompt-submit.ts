import { ensureWorkerRunning, workerPost } from './shared/worker.js'
import { readHookInput, getProject } from './shared/stdin.js'

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

  // Record the user's prompt against the existing session (init'd by SessionStart)
  await workerPost('/api/sessions/prompt', {
    sessionId,
    project: getProject(workDir),
    workDir,
    userPrompt: input.prompt,
  })

  process.exit(0)
}

main().catch(() => process.exit(0))
