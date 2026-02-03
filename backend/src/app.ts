import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './middlewares/error-handler'
import { logger } from './middlewares/logger'
import { health } from './routes/health'

const app = new Hono()

// Global middlewares
app.use('*', logger)
app.use('*', errorHandler)
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
)

// Routes
app.route('/api/health', health)

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
