import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq, and, gt } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users, refreshTokens } from '../db/schema'
import { env } from '../config/env'
import { signJWT } from '../utils/jwt'
import { generateSecureToken, hashToken, generateOAuthState } from '../utils/crypto'
import {
  exchangeCodeForToken,
  getGitHubUser,
  checkOrgMembership,
  checkRepoWriteAccess,
  getOAuthUrl,
} from '../services/github'
import { authMiddleware } from '../middlewares/auth'
import {
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
} from '../middlewares/error-handler'

const auth = new Hono()

const REFRESH_TOKEN_EXPIRY_DAYS = 30
const AUTH_TOKEN_MAX_AGE = 60 * 15 // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * REFRESH_TOKEN_EXPIRY_DAYS // 30 days
const OAUTH_STATE_MAX_AGE = 60 * 10 // 10 minutes

function getCallbackUrl(): string {
  return `${env.FRONTEND_URL}/api/auth/callback`
}

// GET /api/auth/login - Initiate OAuth flow
auth.get('/login', (c) => {
  const state = generateOAuthState()
  const callbackUrl = getCallbackUrl()

  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/auth/callback',
    maxAge: OAUTH_STATE_MAX_AGE,
  })

  const authUrl = getOAuthUrl(state, callbackUrl)
  return c.redirect(authUrl)
})

// GET /api/auth/callback - Handle OAuth callback
auth.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const storedState = getCookie(c, 'oauth_state')

  // Clear the state cookie
  deleteCookie(c, 'oauth_state', { path: '/api/auth/callback' })

  // Validate state
  if (!state || !storedState || state !== storedState) {
    throw new ValidationError('Invalid OAuth state')
  }

  if (!code) {
    throw new ValidationError('No authorization code provided')
  }

  // Exchange code for access token
  const accessToken = await exchangeCodeForToken(code)

  // Get GitHub user info
  const githubUser = await getGitHubUser(accessToken)

  // Check organization membership
  if (env.GITHUB_ORG) {
    const isMember = await checkOrgMembership(accessToken, githubUser.login)
    if (!isMember) {
      throw new ForbiddenError(`You must be a member of ${env.GITHUB_ORG} organization`)
    }
  }

  // Check repository write access
  if (env.GITHUB_OWNER && env.GITHUB_REPO) {
    const hasAccess = await checkRepoWriteAccess(accessToken, githubUser.login)
    if (!hasAccess) {
      throw new ForbiddenError(
        `You must have write access to ${env.GITHUB_OWNER}/${env.GITHUB_REPO}`
      )
    }
  }

  const db = getDb()

  // Upsert user
  const [user] = await db
    .insert(users)
    .values({
      githubId: githubUser.id,
      githubLogin: githubUser.login,
      githubName: githubUser.name,
      githubEmail: githubUser.email,
      githubAvatarUrl: githubUser.avatar_url,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        githubLogin: githubUser.login,
        githubName: githubUser.name,
        githubEmail: githubUser.email,
        githubAvatarUrl: githubUser.avatar_url,
        updatedAt: new Date(),
      },
    })
    .returning()

  // Generate JWT
  const jwt = await signJWT({
    sub: user.id,
    githubLogin: user.githubLogin,
    githubId: user.githubId,
  })

  // Generate refresh token
  const refreshToken = generateSecureToken()
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  })

  // Set cookies
  setCookie(c, 'auth_token', jwt, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: AUTH_TOKEN_MAX_AGE,
  })

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  })

  // Redirect to frontend
  return c.redirect('/')
})

// POST /api/auth/refresh - Refresh JWT token
auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')

  if (!refreshToken) {
    throw new UnauthorizedError('No refresh token provided')
  }

  const tokenHash = hashToken(refreshToken)
  const db = getDb()

  // Find valid refresh token with user
  const result = await db
    .select({
      token: refreshTokens,
      user: users,
    })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (result.length === 0) {
    // Clear invalid refresh token cookie
    deleteCookie(c, 'refresh_token', { path: '/api/auth' })
    throw new UnauthorizedError('Invalid or expired refresh token')
  }

  const { token: oldToken, user } = result[0]

  // Delete old refresh token (token rotation)
  await db.delete(refreshTokens).where(eq(refreshTokens.id, oldToken.id))

  // Generate new JWT
  const jwt = await signJWT({
    sub: user.id,
    githubLogin: user.githubLogin,
    githubId: user.githubId,
  })

  // Generate new refresh token
  const newRefreshToken = generateSecureToken()
  const newTokenHash = hashToken(newRefreshToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Store new refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt,
  })

  // Set new cookies
  setCookie(c, 'auth_token', jwt, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: AUTH_TOKEN_MAX_AGE,
  })

  setCookie(c, 'refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  })

  return c.json({ success: true })
})

// POST /api/auth/logout - Clear authentication state
auth.post('/logout', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken)
    const db = getDb()

    // Delete refresh token from database
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
  }

  // Clear cookies
  deleteCookie(c, 'auth_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/api/auth' })

  return c.json({ success: true })
})

// GET /api/auth/me - Get current user info
auth.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')
  const db = getDb()

  const user = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  })

  if (!user) {
    throw new UnauthorizedError('User not found')
  }

  return c.json({
    id: user.id,
    githubId: user.githubId,
    githubLogin: user.githubLogin,
    githubName: user.githubName,
    githubEmail: user.githubEmail,
    githubAvatarUrl: user.githubAvatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
})

export { auth }
