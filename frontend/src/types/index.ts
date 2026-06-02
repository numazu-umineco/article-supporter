// User type
export interface User {
  id: string
  githubId: number
  githubLogin: string
  githubName: string | null
  githubEmail: string | null
  githubAvatarUrl: string | null
  createdAt: string
  updatedAt: string
}

// Event type
export interface EventType {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Session type
export interface Session {
  id: string
  userId: string
  eventTypeId: string
  eventType?: EventType
  eventDate: string
  title: string | null
  slug: string | null
  articleContent: string | null
  eyecatchImageId: string | null
  status: SessionStatus
  prUrl: string | null
  prNumber: number | null
  branchName: string | null
  model: string
  images?: SessionImage[]
  createdAt: string
  updatedAt: string
}

export type SessionStatus = 'draft' | 'pr_created' | 'merged'

// Chat message type
export interface ChatMessage {
  id: string
  sessionId: string
  role: ChatRole
  content: string
  articleContent: string | null
  createdAt: string
}

export type ChatRole = 'user' | 'assistant'

// Session image type
export interface SessionImage {
  id: string
  sessionId: string
  originalFilename: string
  customFilename: string
  s3Key: string
  s3Url: string
  mimeType: string
  fileSize: number
  isEyecatch: boolean
  createdAt: string
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
