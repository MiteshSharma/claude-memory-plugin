import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, cpSync, existsSync, realpathSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(__dirname, '../../plugin/scripts/server.cjs')
const pluginNodeModules = path.join(__dirname, '../../plugin/node_modules')

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
  // better-sqlite3 has native bindings — must be external, copied to plugin/node_modules
  external: ['better-sqlite3'],
})

// Copy better-sqlite3 native module into plugin/node_modules so server.cjs can require it.
// Use realpathSync to dereference pnpm symlinks before copying to avoid cycles.
const sqliteSymlink = path.join(__dirname, 'node_modules/better-sqlite3')
if (existsSync(sqliteSymlink)) {
  const sqliteReal = realpathSync(sqliteSymlink)
  const sqliteDest = path.join(pluginNodeModules, 'better-sqlite3')
  mkdirSync(pluginNodeModules, { recursive: true })
  cpSync(sqliteReal, sqliteDest, {
    recursive: true,
    dereference: true,   // copy symlink targets, not the symlinks themselves
  })
  console.log(`[server] copied better-sqlite3 → plugin/node_modules/`)
}

console.log(`[server] built to ${outFile}`)
