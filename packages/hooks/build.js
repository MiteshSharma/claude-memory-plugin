import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../../plugin/scripts')
const watch = process.argv.includes('--watch')

mkdirSync(outDir, { recursive: true })

const entryPoints = [
  'src/session-start.ts',
  'src/user-prompt-submit.ts',
  'src/post-tool-use.ts',
  'src/stop.ts',
  'src/user-message.ts',
]

const buildOptions = {
  entryPoints: entryPoints.map((e) => path.join(__dirname, e)),
  outdir: outDir,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: false,
  sourcemap: true,
  external: [], // Bundle everything — hooks have no native dependencies
}

if (watch) {
  const ctx = await esbuild.context(buildOptions)
  await ctx.watch()
  console.log('[hooks] watching for changes...')
} else {
  await esbuild.build(buildOptions)
  console.log(`[hooks] built to ${outDir}`)
}
