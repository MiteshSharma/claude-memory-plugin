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

// Copy better-sqlite3 and its native dependencies into plugin/node_modules so server.cjs can require them.
// better-sqlite3 → bindings → file-uri-to-path (all needed at runtime for native .node loading)
// pnpm hoists these deps next to better-sqlite3 in the virtual store, not in packages/server/node_modules.
const sqliteSymlink = path.join(__dirname, 'node_modules/better-sqlite3')
if (existsSync(sqliteSymlink)) {
  const sqliteReal = realpathSync(sqliteSymlink)
  // Resolve the pnpm virtual store peer directory for better-sqlite3 and its transitive deps.
  // pnpm places peer deps as siblings: .pnpm/<pkg>@<ver>/node_modules/<dep>
  // bindings is next to better-sqlite3, but file-uri-to-path is next to bindings in its own store entry.
  const pnpmPeerDir = path.dirname(sqliteReal)
  mkdirSync(pluginNodeModules, { recursive: true })

  // Helper: find a dep in pnpm virtual store by walking known peer directories
  function copyDep(dep, searchDirs) {
    for (const dir of searchDirs) {
      const src = path.join(dir, dep)
      if (existsSync(src)) {
        cpSync(src, path.join(pluginNodeModules, dep), { recursive: true, dereference: true })
        console.log(`[server] copied ${dep} → plugin/node_modules/`)
        return realpathSync(src)
      }
    }
    console.warn(`[server] WARNING: ${dep} not found`)
    return null
  }

  copyDep('better-sqlite3', [pnpmPeerDir])
  const bindingsReal = copyDep('bindings', [pnpmPeerDir])
  // file-uri-to-path is a dep of bindings, so it's in bindings' pnpm peer dir
  const bindingsPeerDir = bindingsReal ? path.dirname(bindingsReal) : null
  copyDep('file-uri-to-path', [pnpmPeerDir, bindingsPeerDir].filter(Boolean))
}

console.log(`[server] built to ${outFile}`)
