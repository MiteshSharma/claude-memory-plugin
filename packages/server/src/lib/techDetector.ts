import { existsSync } from 'fs'
import path from 'path'

interface TechSignature {
  file: string
  topics: string[]
}

const SIGNATURES: TechSignature[] = [
  { file: 'package.json', topics: ['javascript', 'node'] },
  { file: 'tsconfig.json', topics: ['typescript'] },
  { file: 'go.mod', topics: ['go'] },
  { file: 'Cargo.toml', topics: ['rust'] },
  { file: 'requirements.txt', topics: ['python'] },
  { file: 'pyproject.toml', topics: ['python'] },
  { file: 'Pipfile', topics: ['python'] },
  { file: 'pom.xml', topics: ['java', 'maven'] },
  { file: 'build.gradle', topics: ['java', 'gradle'] },
  { file: 'build.gradle.kts', topics: ['kotlin', 'gradle'] },
  { file: 'Gemfile', topics: ['ruby'] },
  { file: 'composer.json', topics: ['php'] },
  { file: 'mix.exs', topics: ['elixir'] },
  { file: 'Makefile', topics: ['make'] },
  { file: 'Dockerfile', topics: ['docker'] },
  { file: 'docker-compose.yml', topics: ['docker'] },
  { file: 'docker-compose.yaml', topics: ['docker'] },
  { file: 'helm', topics: ['kubernetes', 'helm'] },
  { file: 'Chart.yaml', topics: ['kubernetes', 'helm'] },
  { file: 'terraform', topics: ['terraform'] },
  { file: '.terraform', topics: ['terraform'] },
  { file: 'k8s', topics: ['kubernetes'] },
  { file: '.github/workflows', topics: ['github-actions', 'ci'] },
  { file: '.gitlab-ci.yml', topics: ['gitlab-ci', 'ci'] },
  { file: 'pnpm-workspace.yaml', topics: ['pnpm', 'monorepo'] },
  { file: 'lerna.json', topics: ['monorepo'] },
  { file: 'turbo.json', topics: ['turborepo', 'monorepo'] },
  { file: '.eslintrc.js', topics: ['eslint'] },
  { file: 'eslint.config.js', topics: ['eslint'] },
  { file: 'vite.config.ts', topics: ['vite', 'react'] },
  { file: 'next.config.js', topics: ['nextjs', 'react'] },
  { file: 'next.config.mjs', topics: ['nextjs', 'react'] },
  { file: 'nuxt.config.ts', topics: ['nuxt', 'vue'] },
  { file: 'angular.json', topics: ['angular'] },
  { file: 'svelte.config.js', topics: ['svelte'] },
]

const cache = new Map<string, { topics: string[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function detectTechStack(workDir: string): string[] {
  const cached = cache.get(workDir)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.topics
  }

  const topics = new Set<string>()

  for (const sig of SIGNATURES) {
    const fullPath = path.join(workDir, sig.file)
    if (existsSync(fullPath)) {
      for (const topic of sig.topics) {
        topics.add(topic)
      }
    }
  }

  const result = Array.from(topics)
  cache.set(workDir, { topics: result, timestamp: Date.now() })
  return result
}

export function invalidateTechCache(workDir: string): void {
  cache.delete(workDir)
}
