import { serve } from '@hono/node-server'
import { app } from './app'
import { env } from './config/env'

const port = env.PORT

console.log(`Starting server on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`)
