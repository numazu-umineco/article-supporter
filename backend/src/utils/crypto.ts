import { randomBytes, createHash } from 'crypto'

export function generateSecureToken(length: number = 64): string {
  return randomBytes(length).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateOAuthState(): string {
  return randomBytes(32).toString('hex')
}
