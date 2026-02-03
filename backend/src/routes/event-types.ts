import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middlewares/auth'
import { ValidationError } from '../middlewares/error-handler'
import {
  listEventTypes,
  getEventType,
  createEventType,
  updateEventType,
  deleteEventType,
} from '../services/event-type'

const eventTypesRouter = new Hono()

// All routes require authentication
eventTypesRouter.use('*', authMiddleware)

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  systemPrompt: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/event-types - List event types
eventTypesRouter.get('/', async (c) => {
  const activeOnly = c.req.query('active') === 'true'
  const result = await listEventTypes(activeOnly)
  return c.json(result)
})

// GET /api/event-types/:id - Get event type
eventTypesRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await getEventType(id)
  return c.json(result)
})

// POST /api/event-types - Create event type
eventTypesRouter.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const result = await createEventType(parsed.data)
  return c.json(result, 201)
})

// PATCH /api/event-types/:id - Update event type
eventTypesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const result = await updateEventType(id, parsed.data)
  return c.json(result)
})

// DELETE /api/event-types/:id - Delete event type
eventTypesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await deleteEventType(id)
  return c.json({ success: true })
})

export { eventTypesRouter }
