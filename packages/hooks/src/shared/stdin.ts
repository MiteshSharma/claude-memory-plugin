import { HookInputSchema, type HookInput } from '@memory-updater/shared'
import { readFileSync } from 'fs'

export function readHookInput(): HookInput {
  try {
    // Read from stdin synchronously — hooks are short-lived processes
    const raw = readFileSync('/dev/stdin', 'utf8').trim()
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    const result = HookInputSchema.safeParse(parsed)
    if (!result.success) return {}
    return result.data
  } catch {
    return {}
  }
}

export function getProject(workDir: string): string {
  return workDir.split('/').filter(Boolean).pop() ?? 'unknown'
}
