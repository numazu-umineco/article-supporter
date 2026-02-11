import { Hono } from 'hono'
import { authMiddleware } from '../middlewares/auth'
import { ValidationError } from '../middlewares/error-handler'
import { getSession } from '../services/session'
import { publishSession } from '../services/git/publish-service'

const publishRouter = new Hono()

publishRouter.use('*', authMiddleware)

// POST /api/sessions/:id/publish - Create or update PR
publishRouter.post('/:id/publish', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  // Get session with images
  const session = await getSession(id, user.id)

  if (session.status === 'merged') {
    throw new ValidationError('マージ済みのセッションは更新できません')
  }

  const result = await publishSession(session, user)

  // For updates, use existing session data for prUrl/prNumber
  if (session.status === 'pr_created') {
    return c.json({
      ...session,
      prUrl: session.prUrl,
      prNumber: session.prNumber,
      branchName: result.branchName,
    })
  }

  // Refresh session to return updated data
  const updated = await getSession(id, user.id)
  return c.json(updated)
})

export { publishRouter }
