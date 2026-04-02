import { ensureWorkerRunning, workerGet } from './shared/worker.js'
import { readHookInput, getProject } from './shared/stdin.js'

async function main(): Promise<void> {
  const input = readHookInput()
  const workDir = input.cwd ?? process.cwd()
  const project = getProject(workDir)

  // 1. Ensure the background server daemon is running
  const running = await ensureWorkerRunning()
  if (!running) {
    // Server unavailable — graceful degradation, never block Claude Code
    process.exit(0)
  }

  // 2. Fetch context to inject into this session
  const res = await workerGet(`/api/context/inject?project=${encodeURIComponent(project)}`)
  if (!res?.ok) {
    process.exit(0)
  }

  const data = (await res.json()) as { context?: string }

  // Claude Code hook response — additionalContext is prepended to system prompt
  const output = {
    hookEventName: 'SessionStart',
    additionalContext: data.context ?? '',
  }

  process.stdout.write(JSON.stringify(output) + '\n')
  process.exit(0)
}

main().catch(() => process.exit(0))
