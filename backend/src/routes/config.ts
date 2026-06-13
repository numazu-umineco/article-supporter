import { Hono } from 'hono'
import { env } from '../config/env'
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../config/models'

const configRouter = new Hono()

configRouter.get('/', (c) => {
  return c.json({
    targetSiteBaseUrl: env.TARGET_SITE_BASE_URL ?? null,
    availableModels: AVAILABLE_MODELS,
    defaultModel: DEFAULT_MODEL,
  })
})

export { configRouter }
