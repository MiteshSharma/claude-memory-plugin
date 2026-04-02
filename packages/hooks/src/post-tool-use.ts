import { ensureWorkerRunning, workerPost } from './shared/worker.js'
import { readHookInput } from './shared/stdin.js'

async function main(): Promise<void> {
  const input = readHookInput()
  const sessionId = input.session_id
  const toolName = input.tool_name
  const workDir = input.cwd ?? process.cwd()

  if (!sessionId || !toolName) {
    process.exit(0)
  }

  const running = await ensureWorkerRunning()
  if (!running) {
    process.exit(0)
  }

  await workerPost('/api/activities', {
    sessionId,
    toolName,
    toolInput: input.tool_input,
    toolResponse: input.tool_response,
    workDir,
  })

  process.exit(0)
}

main().catch(() => process.exit(0))
