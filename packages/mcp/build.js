import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(__dirname, '../../plugin/scripts/mcp-server.cjs')

mkdirSync(path.dirname(outFile), { recursive: true })

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: false,
  sourcemap: true,
})

console.log(`[mcp] built to ${outFile}`)
