import { Hono } from 'hono'
import { db } from '../db/client'

const health = new Hono()

health.get('/', async (c) => {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }

  // Check database connection if configured
  if (db) {
    try {
      await db.execute('SELECT 1')
      checks.database = 'connected'
    } catch {
      checks.database = 'disconnected'
    }
  } else {
    checks.database = 'not configured'
  }

  return c.json(checks)
})

export { health }
