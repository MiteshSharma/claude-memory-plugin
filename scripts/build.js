import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

console.log(`\n[build] Memory Updater v${pkg.version}\n`)

function run(cmd, label) {
  console.log(`[build] ${label}...`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

// Ensure plugin/scripts directory exists
mkdirSync(path.join(root, 'plugin/scripts'), { recursive: true })

// 1. Build shared (others depend on it)
run('pnpm --filter @memory-updater/shared build', '1/5 shared')

// 2. Build server → plugin/scripts/server.cjs
run('pnpm --filter @memory-updater/server build', '2/5 server')

// 3. Build hooks → plugin/scripts/*.js
run('pnpm --filter @memory-updater/hooks build', '3/5 hooks')

// 4. Build MCP → plugin/scripts/mcp-server.cjs
run('pnpm --filter @memory-updater/mcp build', '4/5 mcp')

// 5. Build UI → plugin/ui/
mkdirSync(path.join(root, 'plugin/ui'), { recursive: true })
run('pnpm --filter @memory-updater/ui build', '5/5 ui')

// Stamp current version into plugin.json
const pluginJsonPath = path.join(root, 'plugin/.claude-plugin/plugin.json')
const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'))
pluginJson.version = pkg.version
writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + '\n')

const built = readdirSync(path.join(root, 'plugin/scripts')).join(', ')
console.log(`\n[build] done → plugin/ directory ready`)
console.log(`[build] scripts: ${built}`)
