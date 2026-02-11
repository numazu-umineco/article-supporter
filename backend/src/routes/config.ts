import { Hono } from 'hono'
import { env } from '../config/env'

const configRouter = new Hono()

configRouter.get('/', (c) => {
  return c.json({
    targetSiteBaseUrl: env.TARGET_SITE_BASE_URL ?? null,
  })
})

export { configRouter }
