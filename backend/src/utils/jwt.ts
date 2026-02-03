import * as jose from 'jose'
import { env } from '../config/env'

export interface JWTPayload {
  sub: string
  githubLogin: string
  githubId: number
  iat: number
  exp: number
}

const JWT_EXPIRATION = '15m'
const getSecret = () => new TextEncoder().encode(env.JWT_SECRET)

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getSecret()

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const secret = getSecret()

  const { payload } = await jose.jwtVerify(token, secret)

  return payload as unknown as JWTPayload
}
