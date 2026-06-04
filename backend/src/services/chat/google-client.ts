import { GoogleGenAI } from '@google/genai'
import { env } from '../../config/env'
import type { ChatCompletionMessage } from './llm-client'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY })
  }
  return client
}

export async function getGoogleChatCompletion(
  messages: ChatCompletionMessage[],
  model: string
): Promise<string> {
  const ai = getClient()

  const systemMessage = messages.find(m => m.role === 'system')
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

  const response = await ai.models.generateContent({
    model,
    contents: chatMessages,
    config: {
      systemInstruction: systemMessage?.content,
    },
  })

  const content = response.text
  if (!content) {
    throw new Error('No response content from Google AI')
  }

  return content
}
