import { getModelDefinition } from '../../config/models'
import { getOpenAIChatCompletion } from './openai-client'
import { getGoogleChatCompletion } from './google-client'

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function getChatCompletion(
  messages: ChatCompletionMessage[],
  modelId: string
): Promise<string> {
  const definition = getModelDefinition(modelId)
  if (!definition) {
    throw new Error(`Unknown model: ${modelId}`)
  }

  switch (definition.provider) {
    case 'openai':
      return getOpenAIChatCompletion(messages, modelId)
    case 'google':
      return getGoogleChatCompletion(messages, modelId)
  }
}
