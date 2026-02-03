import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middlewares/auth'
import { ValidationError } from '../middlewares/error-handler'
import {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
} from '../services/session'

const sessionsRouter = new Hono()

sessionsRouter.use('*', authMiddleware)

const createSchema = z.object({
  eventTypeId: z.string().uuid('Invalid event type ID'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
})

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Slug must contain only alphanumeric characters, hyphens, and underscores')
    .nullable()
    .optional(),
  articleContent: z.string().nullable().optional(),
  eyecatchImageId: z.string().uuid().nullable().optional(),
})

// GET /api/sessions - List sessions
sessionsRouter.get('/', async (c) => {
  const user = c.get('user')
  const result = await listSessions(user.id)
  return c.json(result)
})

// GET /api/sessions/:id - Get session
sessionsRouter.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const result = await getSession(id, user.id)
  return c.json(result)
})

// POST /api/sessions - Create session
sessionsRouter.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const result = await createSession({
    userId: user.id,
    eventTypeId: parsed.data.eventTypeId,
    eventDate: parsed.data.eventDate,
  })
  return c.json(result, 201)
})

// PATCH /api/sessions/:id - Update session
sessionsRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const result = await updateSession(id, user.id, parsed.data)
  return c.json(result)
})

// DELETE /api/sessions/:id - Delete session
sessionsRouter.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  await deleteSession(id, user.id)
  return c.json({ success: true })
})

export { sessionsRouter }
