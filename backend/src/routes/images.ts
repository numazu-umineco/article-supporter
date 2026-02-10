import { Hono } from 'hono'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { authMiddleware } from '../middlewares/auth'
import { NotFoundError, ValidationError } from '../middlewares/error-handler'
import { getDb } from '../db/client'
import { sessions, sessionImages } from '../db/schema'
import { uploadFile, deleteFile } from '../services/storage/s3-service'

const imagesRouter = new Hono()

imagesRouter.use('*', authMiddleware)

const updateSchema = z.object({
  customFilename: z.string().min(1).optional(),
  isEyecatch: z.boolean().optional(),
})

// Helper: verify session ownership
async function verifySessionOwnership(sessionId: string, userId: string) {
  const db = getDb()
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
  })
  if (!session) {
    throw new NotFoundError('Session not found')
  }
  if (session.status === 'merged') {
    throw new ValidationError('Cannot modify images of a merged session')
  }
  return session
}

// POST /api/sessions/:id/images - Upload image
imagesRouter.post('/:id/images', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')

  await verifySessionOwnership(sessionId, user.id)

  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    throw new ValidationError('File is required')
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('Only JPEG, PNG, GIF, and WebP images are allowed')
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new ValidationError('File size must be less than 10MB')
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const fileId = crypto.randomUUID()
  const s3Key = `sessions/${sessionId}/${fileId}-${file.name}`

  const s3Url = await uploadFile(s3Key, buffer, file.type)

  const db = getDb()
  const [image] = await db
    .insert(sessionImages)
    .values({
      sessionId,
      originalFilename: file.name,
      customFilename: file.name,
      s3Key,
      s3Url,
      mimeType: file.type,
      fileSize: file.size,
    })
    .returning()

  return c.json(image, 201)
})

// PATCH /api/sessions/:id/images/:imageId - Update image info
imagesRouter.patch('/:id/images/:imageId', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')
  const imageId = c.req.param('imageId')

  await verifySessionOwnership(sessionId, user.id)

  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }

  const db = getDb()

  // Verify image belongs to this session
  const existing = await db.query.sessionImages.findFirst({
    where: and(eq(sessionImages.id, imageId), eq(sessionImages.sessionId, sessionId)),
  })

  if (!existing) {
    throw new NotFoundError('Image not found')
  }

  const updateData: Record<string, unknown> = {}

  if (parsed.data.customFilename !== undefined) {
    updateData.customFilename = parsed.data.customFilename
  }

  if (parsed.data.isEyecatch !== undefined) {
    updateData.isEyecatch = parsed.data.isEyecatch

    if (parsed.data.isEyecatch) {
      // Unset eyecatch for all other images in this session
      await db
        .update(sessionImages)
        .set({ isEyecatch: false })
        .where(eq(sessionImages.sessionId, sessionId))

      // Update session's eyecatchImageId
      await db
        .update(sessions)
        .set({ eyecatchImageId: imageId, updatedAt: new Date() })
        .where(eq(sessions.id, sessionId))
    } else {
      // If unsetting eyecatch, clear session's eyecatchImageId if it matches
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      })
      if (session?.eyecatchImageId === imageId) {
        await db
          .update(sessions)
          .set({ eyecatchImageId: null, updatedAt: new Date() })
          .where(eq(sessions.id, sessionId))
      }
    }
  }

  const [updated] = await db
    .update(sessionImages)
    .set(updateData)
    .where(and(eq(sessionImages.id, imageId), eq(sessionImages.sessionId, sessionId)))
    .returning()

  return c.json(updated)
})

// DELETE /api/sessions/:id/images/:imageId - Delete image
imagesRouter.delete('/:id/images/:imageId', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')
  const imageId = c.req.param('imageId')

  await verifySessionOwnership(sessionId, user.id)

  const db = getDb()

  // Verify image belongs to this session
  const existing = await db.query.sessionImages.findFirst({
    where: and(eq(sessionImages.id, imageId), eq(sessionImages.sessionId, sessionId)),
  })

  if (!existing) {
    throw new NotFoundError('Image not found')
  }

  // Delete from S3
  await deleteFile(existing.s3Key)

  // Delete from DB
  await db
    .delete(sessionImages)
    .where(and(eq(sessionImages.id, imageId), eq(sessionImages.sessionId, sessionId)))

  // If this was the eyecatch, clear session's eyecatchImageId
  if (existing.isEyecatch) {
    await db
      .update(sessions)
      .set({ eyecatchImageId: null, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId))
  }

  return c.json({ success: true })
})

export { imagesRouter }
