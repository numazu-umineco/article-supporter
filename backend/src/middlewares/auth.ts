import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJWT } from '../utils/jwt'
import { UnauthorizedError } from './error-handler'

export interface AuthUser {
  id: string
  githubId: number
  githubLogin: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const token = getCookie(c, 'auth_token')

  if (!token) {
    throw new UnauthorizedError('No authentication token provided')
  }

  try {
    const payload = await verifyJWT(token)

    c.set('user', {
      id: payload.sub,
      githubId: payload.githubId,
      githubLogin: payload.githubLogin,
    })

    await next()
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export async function optionalAuthMiddleware(
  c: Context,
  next: Next
): Promise<Response | void> {
  const token = getCookie(c, 'auth_token')

  if (token) {
    try {
      const payload = await verifyJWT(token)

      c.set('user', {
        id: payload.sub,
        githubId: payload.githubId,
        githubLogin: payload.githubLogin,
      })
    } catch {
      // Token is invalid, but we don't throw - just proceed without user
    }
  }

  await next()
}
