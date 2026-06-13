import { pgTable, uuid, varchar, text, timestamp, integer, boolean, date } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: integer('github_id').unique().notNull(),
  githubLogin: varchar('github_login', { length: 255 }).notNull(),
  githubName: varchar('github_name', { length: 255 }),
  githubEmail: varchar('github_email', { length: 255 }),
  githubAvatarUrl: text('github_avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Event types table
export const eventTypes = pgTable('event_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  eventTypeId: uuid('event_type_id').notNull().references(() => eventTypes.id),
  eventDate: date('event_date').notNull(),
  title: varchar('title', { length: 255 }),
  slug: varchar('slug', { length: 255 }),
  articleContent: text('article_content'),
  eyecatchImageId: uuid('eyecatch_image_id'),
  status: varchar('status', { length: 50 }).default('draft'), // draft, pr_created, merged, closed
  prUrl: text('pr_url'),
  prNumber: integer('pr_number'),
  branchName: varchar('branch_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Chat messages table
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // user, assistant
  content: text('content').notNull(),
  articleContent: text('article_content'), // Extracted <article> tag content
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Session images table
export const sessionImages = pgTable('session_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  customFilename: varchar('custom_filename', { length: 255 }).notNull(),
  s3Key: text('s3_key').notNull(),
  s3Url: text('s3_url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  isEyecatch: boolean('is_eyecatch').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Refresh tokens table
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  refreshTokens: many(refreshTokens),
}))

export const eventTypesRelations = relations(eventTypes, ({ many }) => ({
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  eventType: one(eventTypes, {
    fields: [sessions.eventTypeId],
    references: [eventTypes.id],
  }),
  messages: many(chatMessages),
  images: many(sessionImages),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(sessions, {
    fields: [chatMessages.sessionId],
    references: [sessions.id],
  }),
}))

export const sessionImagesRelations = relations(sessionImages, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionImages.sessionId],
    references: [sessions.id],
  }),
}))

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type EventType = typeof eventTypes.$inferSelect
export type NewEventType = typeof eventTypes.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
export type SessionImage = typeof sessionImages.$inferSelect
export type NewSessionImage = typeof sessionImages.$inferInsert
export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
