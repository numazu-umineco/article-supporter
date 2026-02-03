import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middlewares/auth'
import { ValidationError } from '../middlewares/error-handler'
import { getSession } from '../services/session'
import { getMessages, sendMessage } from '../services/chat/chat-service'

const chatRouter = new Hono()

chatRouter.use('*', authMiddleware)

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  currentState: z
    .object({
      title: z.string().nullable().optional(),
      slug: z.string().nullable().optional(),
      articleContent: z.string().nullable().optional(),
    })
    .optional(),
})

// GET /api/sessions/:id/messages - Get chat messages
chatRouter.get('/:id/messages', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')

  // Verify ownership
  await getSession(sessionId, user.id)

  const messages = await getMessages(sessionId)
  return c.json(messages)
})

// POST /api/sessions/:id/messages - Send message
chatRouter.post('/:id/messages', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')

  // Verify ownership and not merged
  const session = await getSession(sessionId, user.id)
  if (session.status === 'merged') {
    throw new ValidationError('Cannot send messages to a merged session')
  }

  const body = await c.req.json()
  const parsed = sendMessageSchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const result = await sendMessage(
    sessionId,
    parsed.data.content,
    parsed.data.currentState ?? {}
  )

  return c.json(result)
})

export { chatRouter }
