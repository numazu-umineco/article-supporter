import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { sessions, eventTypes } from '../db/schema'
import { NotFoundError, ValidationError } from '../middlewares/error-handler'

export async function listSessions(userId: string) {
  const db = getDb()

  return db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    with: {
      eventType: true,
    },
    orderBy: [desc(sessions.updatedAt)],
  })
}

export async function getSession(id: string, userId: string) {
  const db = getDb()

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, id), eq(sessions.userId, userId)),
    with: {
      eventType: true,
      images: true,
    },
  })

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  return session
}

export async function createSession(data: {
  userId: string
  eventTypeId: string
  eventDate: string
}) {
  const db = getDb()

  // Verify event type exists and is active
  const eventType = await db.query.eventTypes.findFirst({
    where: and(eq(eventTypes.id, data.eventTypeId), eq(eventTypes.isActive, true)),
  })

  if (!eventType) {
    throw new ValidationError('Invalid or inactive event type')
  }

  const [session] = await db
    .insert(sessions)
    .values({
      userId: data.userId,
      eventTypeId: data.eventTypeId,
      eventDate: data.eventDate,
    })
    .returning()

  return session
}

export async function updateSession(
  id: string,
  userId: string,
  data: {
    title?: string | null
    slug?: string | null
    articleContent?: string | null
    eyecatchImageId?: string | null
  }
) {
  const db = getDb()

  // Check existence and ownership
  const existing = await getSession(id, userId)

  if (existing.status === 'merged') {
    throw new ValidationError('Cannot edit a merged session')
  }

  const [updated] = await db
    .update(sessions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .returning()

  return updated
}

export async function updateSessionPublishStatus(
  id: string,
  data: {
    status: string
    prUrl: string
    prNumber: number
    branchName: string
  }
) {
  const db = getDb()

  const [updated] = await db
    .update(sessions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, id))
    .returning()

  return updated
}

export async function deleteSession(id: string, userId: string) {
  const db = getDb()

  const existing = await getSession(id, userId)

  if (existing.status !== 'draft') {
    throw new ValidationError('Can only delete draft sessions')
  }

  await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
}
