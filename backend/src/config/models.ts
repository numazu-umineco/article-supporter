export type ModelProvider = 'openai' | 'google'

export interface ModelDefinition {
  id: string
  label: string
  provider: ModelProvider
}

export const AVAILABLE_MODELS: ModelDefinition[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai' },
]

export const DEFAULT_MODEL = 'gpt-4o-mini'

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId)
}
