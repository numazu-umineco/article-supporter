// Re-export database types
export type {
  User,
  NewUser,
  EventType,
  NewEventType,
  Session,
  NewSession,
  ChatMessage,
  NewChatMessage,
  SessionImage,
  NewSessionImage,
  RefreshToken,
  NewRefreshToken,
} from '../db/schema'

// JWT Payload type
export interface JWTPayload {
  sub: string // user.id
  githubLogin: string
  githubId: number
  exp: number
  iat: number
}

// API Response types
export interface ApiError {
  code: string
  message: string
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

// Session status
export type SessionStatus = 'draft' | 'pr_created' | 'merged' | 'closed'

// Chat message role
export type ChatRole = 'user' | 'assistant'
