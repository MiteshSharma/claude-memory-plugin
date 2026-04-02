import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC_API_KEY, AGENT_MODEL } from '../config.js'
import { OBSERVER_SYSTEM_PROMPT } from './prompts/observer-system.js'
import { SUMMARIZER_SYSTEM_PROMPT } from './prompts/summarizer-system.js'

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

export interface ExtractedSummary {
  request: string
  investigated: string
  insights: string
  completed: string
  pendingWork: string
  notes: string
}

export class ObserverAgent {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  }

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
      const response = await this.client.messages.create({
        model: AGENT_MODEL,
        max_tokens: 2048,
        system: OBSERVER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const tokensUsed =
        (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

      const parsed = JSON.parse(text)
      const activities = Array.isArray(parsed) ? parsed : []

      return { activities, tokensUsed }
    } catch (err) {
      console.error('[agent] extractActivities failed:', err instanceof Error ? err.message : err)
      return { activities: [], tokensUsed: 0 }
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
      const response = await this.client.messages.create({
        model: AGENT_MODEL,
        max_tokens: 2048,
        system: SUMMARIZER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const tokensUsed =
        (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

      const summary = JSON.parse(text) as ExtractedSummary
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
