import { isWorkerRunning, workerGet } from './shared/worker.js'
import { readHookInput, getProject } from './shared/stdin.js'

async function main(): Promise<void> {
  const input = readHookInput()
  const workDir = input.cwd ?? process.cwd()
  const project = getProject(workDir)

  const running = await isWorkerRunning()
  if (!running) {
    process.stderr.write('[claude-plugin-kit] server not running\n')
    process.exit(0)
  }

  const res = await workerGet(`/api/context/inject?project=${encodeURIComponent(project)}`)
  if (!res?.ok) {
    process.exit(0)
  }

  const data = (await res.json()) as { activityCount?: number; sessionCount?: number }

  process.stderr.write(
    `[claude-plugin-kit] project=${project} activities=${data.activityCount ?? 0} sessions=${data.sessionCount ?? 0}\n`,
  )
  process.stderr.write(`[claude-plugin-kit] viewer → http://127.0.0.1:37799/docs\n`)

  process.exit(0)
}

main().catch(() => process.exit(0))
