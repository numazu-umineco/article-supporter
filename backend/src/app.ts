import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './middlewares/error-handler'
import { logger } from './middlewares/logger'
import { health } from './routes/health'
import { auth } from './routes/auth'
import { eventTypesRouter } from './routes/event-types'
import { sessionsRouter } from './routes/sessions'
import { chatRouter } from './routes/chat'

const app = new Hono()

// Global middlewares
app.use('*', logger)
app.onError(errorHandler)
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
)

// Routes
app.route('/api/health', health)
app.route('/api/auth', auth)
app.route('/api/event-types', eventTypesRouter)
app.route('/api/sessions', sessionsRouter)
app.route('/api/sessions', chatRouter)

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Not found',
      },
    },
    404
  )
})

export { app }
