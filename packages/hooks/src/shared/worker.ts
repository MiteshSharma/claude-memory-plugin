import { spawn } from 'child_process'
import { createWriteStream, existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { WORKER_URL, WORKER_PORT, DATA_DIR, HEALTH_TIMEOUT, PLUGIN_ROOT } from './config.js'

export async function isWorkerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER_URL}/api/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Determine how to launch the server.
 *
 * Priority order:
 *   1. Dev mode: hooks script is inside a monorepo (packages/hooks/src → packages/server/src exists)
 *      → launch via tsx directly from source (no native-binary issues)
 *   2. Production: plugin/scripts/server.cjs exists and has no native issues
 *      → launch with node
 */
function resolveServerCommand(): { cmd: string; args: string[] } {
  const nodeExe = process.execPath ?? 'node'

  // Dev detection: __dirname inside the compiled hook bundle points to plugin/scripts/.
  // Walk up to find a pnpm monorepo root (has packages/server/src/index.ts + node_modules/.bin/tsx).
  // We try multiple parent levels since the hook could be run from plugin/scripts/ (2 levels up from project root).
  for (const levelsUp of [2, 3, 4]) {
    const candidate = path.resolve(__dirname, ...Array(levelsUp).fill('..'))
    const serverSrc = path.join(candidate, 'packages/server/src/index.ts')
    const tsxBin = path.join(candidate, 'node_modules/.bin/tsx')
    if (existsSync(serverSrc) && existsSync(tsxBin)) {
      return {
        cmd: nodeExe,
        args: ['--import', `${tsxBin}/esm`, serverSrc],
      }
    }
  }

  // Production: bundled server.cjs with properly installed node_modules
  const serverCjs = path.join(PLUGIN_ROOT, 'scripts', 'server.cjs')
  return { cmd: nodeExe, args: [serverCjs] }
}

export async function ensureWorkerRunning(): Promise<boolean> {
  if (await isWorkerRunning()) return true

  try {
    await mkdir(DATA_DIR, { recursive: true })
    const logPath = path.join(DATA_DIR, 'server.log')
    const log = createWriteStream(logPath, { flags: 'a' })

    const { cmd, args } = resolveServerCommand()

    const child = spawn(cmd, args, {
      detached: true,
      stdio: ['ignore', log, log],
      env: {
        ...process.env,
        PLUGIN_PORT: String(WORKER_PORT),
        PLUGIN_DATA_DIR: DATA_DIR,
        NODE_ENV: 'production',
      },
    })
    child.unref()

    // Wait up to 5s for server to be ready
    for (let i = 0; i < 10; i++) {
      await sleep(500)
      if (await isWorkerRunning()) {
        console.error(`[hook] worker started (logs at ${logPath})`)
        return true
      }
    }

    console.error('[hook] worker did not start in time')
    return false
  } catch (err) {
    console.error('[hook] failed to start worker:', err)
    return false
  }
}

export async function workerPost(urlPath: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(`${WORKER_URL}${urlPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    return null
  }
}

export async function workerGet(urlPath: string): Promise<Response | null> {
  try {
    return await fetch(`${WORKER_URL}${urlPath}`, {
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
