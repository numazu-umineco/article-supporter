export const AVAILABLE_MODELS = [
  'gpt-4o-mini',
] as const

export type AvailableModel = (typeof AVAILABLE_MODELS)[number]

export const DEFAULT_MODEL: AvailableModel = 'gpt-4o-mini'
