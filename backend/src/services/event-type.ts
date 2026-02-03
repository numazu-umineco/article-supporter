import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { eventTypes } from '../db/schema'
import { NotFoundError } from '../middlewares/error-handler'

export async function listEventTypes(activeOnly: boolean = false) {
  const db = getDb()

  if (activeOnly) {
    return db.query.eventTypes.findMany({
      where: eq(eventTypes.isActive, true),
      orderBy: (et, { asc }) => [asc(et.name)],
    })
  }

  return db.query.eventTypes.findMany({
    orderBy: (et, { asc }) => [asc(et.name)],
  })
}

export async function getEventType(id: string) {
  const db = getDb()

  const eventType = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.id, id),
  })

  if (!eventType) {
    throw new NotFoundError('Event type not found')
  }

  return eventType
}

export async function createEventType(data: {
  name: string
  description?: string | null
  systemPrompt: string
  isActive?: boolean
}) {
  const db = getDb()

  const [eventType] = await db
    .insert(eventTypes)
    .values({
      name: data.name,
      description: data.description ?? null,
      systemPrompt: data.systemPrompt,
      isActive: data.isActive ?? true,
    })
    .returning()

  return eventType
}

export async function updateEventType(
  id: string,
  data: {
    name?: string
    description?: string | null
    systemPrompt?: string
    isActive?: boolean
  }
) {
  const db = getDb()

  // Check existence
  await getEventType(id)

  const [updated] = await db
    .update(eventTypes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(eventTypes.id, id))
    .returning()

  return updated
}

export async function deleteEventType(id: string) {
  const db = getDb()

  // Check existence
  await getEventType(id)

  await db.delete(eventTypes).where(eq(eventTypes.id, id))
}
