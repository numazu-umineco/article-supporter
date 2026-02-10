import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { env } from '../../config/env'

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    })
  }
  return s3Client
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const client = getS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )

  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
}

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client()

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  )
}

export async function downloadFile(key: string): Promise<Buffer> {
  const client = getS3Client()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  )

  const stream = response.Body
  if (!stream) {
    throw new Error('Empty response body from S3')
  }

  const chunks: Uint8Array[] = []
  // @ts-expect-error - Node.js stream from S3
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
