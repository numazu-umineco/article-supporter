import OpenAI from 'openai'
import { env } from '../../config/env'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }
  return client
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function getChatCompletion(
  messages: ChatCompletionMessage[],
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const openai = getClient()

  const response = await openai.chat.completions.create({
    model,
    messages,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response content from OpenAI')
  }

  return content
}
