import { execFile } from 'child_process'
import { AGENT_MODEL, CLAUDE_CLI_PATH } from '../config.js'
import { OBSERVER_SYSTEM_PROMPT } from './prompts/observer-system.js'
import { SUMMARIZER_SYSTEM_PROMPT } from './prompts/summarizer-system.js'
import { LEARNING_EXTRACTOR_SYSTEM_PROMPT } from './prompts/learning-extractor-system.js'

export interface ExtractedActivity {
  type: string
  title: string
  subtitle: string | null
  narrative: string
  facts: string[]
  concepts: string[]
  files_read: string[]
  files_modified: string[]
}

export interface ExtractedLearning {
  key: string
  category: string
  pattern: string
  topics: string[]
}

export interface ExtractedSummary {
  request: string
  investigated: string
  insights: string
  completed: string
  pendingWork: string
  notes: string
}

interface ClaudeJsonResponse {
  type: string
  subtype: string
  cost_usd: number
  is_error: boolean
  duration_ms: number
  duration_api_ms: number
  num_turns: number
  result: string
  session_id: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

function runClaude(systemPrompt: string, userMessage: string): Promise<{ text: string; tokensUsed: number }> {
  return new Promise((resolve, reject) => {
    // '--' separates flags from the positional prompt argument.
    // Without it, '--tools ""' (variadic) would consume userMessage as a tool name,
    // causing "Input must be provided" error.
    const args = [
      '-p',
      '--output-format', 'json',
      '--model', AGENT_MODEL,
      '--system-prompt', systemPrompt,
      '--no-session-persistence',
      userMessage,
    ]

    execFile(CLAUDE_CLI_PATH, args, {
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, DISABLE_HOOKS: '1' },
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('[agent] claude CLI error:', err.message)
        if (stderr) console.error('[agent] stderr:', stderr.slice(0, 500))
        return reject(err)
      }

      try {
        const response = JSON.parse(stdout) as ClaudeJsonResponse
        if (response.is_error) {
          return reject(new Error(`claude CLI returned error: ${response.result}`))
        }

        const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
        resolve({ text: response.result, tokensUsed })
      } catch {
        // Fallback: stdout might be plain text in some modes
        resolve({ text: stdout.trim(), tokensUsed: 0 })
      }
    })
  })
}

/**
 * The global CLAUDE.md injects a "Hi Mr Mitesh" greeting prefix into every response,
 * which breaks JSON.parse. This function extracts the first valid JSON array or object
 * from the raw text, discarding any prose prefix/suffix the model adds.
 */
function extractJson(raw: string): unknown {
  // Try direct parse first (happy path — no contamination)
  try {
    return JSON.parse(raw)
  } catch {
    // Fall through to extraction
  }

  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // Fall through
    }
  }

  // Find the outermost JSON array or object by scanning for first [ or {
  const arrayStart = raw.indexOf('[')
  const objectStart = raw.indexOf('{')
  const start = arrayStart === -1 ? objectStart
    : objectStart === -1 ? arrayStart
    : Math.min(arrayStart, objectStart)

  if (start === -1) throw new Error('No JSON structure found in response')

  const lastArray = raw.lastIndexOf(']')
  const lastObject = raw.lastIndexOf('}')
  const end = Math.max(lastArray, lastObject)

  if (end <= start) throw new Error('Could not find closing bracket in response')

  return JSON.parse(raw.slice(start, end + 1))
}

export class ObserverAgent {
  async extractActivities(
    toolName: string,
    toolInput: unknown,
    toolResponse: unknown,
  ): Promise<{ activities: ExtractedActivity[]; tokensUsed: number }> {
    const userMessage = [
      `Tool: ${toolName}`,
      `Input: ${JSON.stringify(toolInput ?? {}).slice(0, 4000)}`,
      `Response: ${JSON.stringify(toolResponse ?? {}).slice(0, 8000)}`,
    ].join('\n')

    try {
      const { text, tokensUsed } = await runClaude(OBSERVER_SYSTEM_PROMPT, userMessage)
      const parsed = extractJson(text)
      const activities = Array.isArray(parsed) ? parsed : []
      return { activities, tokensUsed }
    } catch (err) {
      console.error('[agent] extractActivities failed:', err instanceof Error ? err.message : err)
      console.error('[agent] raw response was:', typeof err === 'object' ? '' : String(err))
      return { activities: [], tokensUsed: 0 }
    }
  }

  async extractLearnings(
    summaryJson: string,
    activitiesJson: string,
  ): Promise<{ learnings: ExtractedLearning[]; tokensUsed: number }> {
    const userMessage = [
      'Session summary:',
      summaryJson,
      '',
      'Activities from this session:',
      activitiesJson,
    ].join('\n')

    try {
      const { text, tokensUsed } = await runClaude(LEARNING_EXTRACTOR_SYSTEM_PROMPT, userMessage)
      const parsed = extractJson(text)
      const learnings = Array.isArray(parsed) ? (parsed as ExtractedLearning[]) : []
      // Validate and normalize canonical keys
      const valid = learnings.filter(
        (l) => l.key && l.category && l.pattern && l.topics?.length > 0,
      ).map((l) => ({
        ...l,
        key: l.key.toLowerCase().replace(/[^a-z0-9/-]/g, '-').slice(0, 40),
      }))
      return { learnings: valid, tokensUsed }
    } catch (err) {
      console.error('[agent] extractLearnings failed:', err instanceof Error ? err.message : err)
      return { learnings: [], tokensUsed: 0 }
    }
  }

  async summarizeSession(
    activitiesJson: string,
    promptsJson: string,
  ): Promise<{ summary: ExtractedSummary | null; tokensUsed: number }> {
    const userMessage = [
      'Activities from this session:',
      activitiesJson,
      '',
      'User prompts from this session:',
      promptsJson,
    ].join('\n')

    try {
      const { text, tokensUsed } = await runClaude(SUMMARIZER_SYSTEM_PROMPT, userMessage)
      const summary = extractJson(text) as ExtractedSummary
      if (!summary.request || !summary.completed) {
        return { summary: null, tokensUsed }
      }
      return { summary, tokensUsed }
    } catch (err) {
      console.error('[agent] summarizeSession failed:', err instanceof Error ? err.message : err)
      return { summary: null, tokensUsed: 0 }
    }
  }
}
