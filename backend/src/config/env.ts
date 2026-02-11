import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().url(),

  // GitHub App
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_APP_INSTALLATION_ID: z.string(),
  GITHUB_OWNER: z.string(),
  GITHUB_REPO: z.string(),
  GITHUB_ORG: z.string(),

  // OpenAI
  OPENAI_API_KEY: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // S3
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string(),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),

  // Target site
  TARGET_SITE_BASE_URL: z.string().url().optional(),
})

// For development, allow partial config during initial setup
const partialEnvSchema = envSchema.partial().extend({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().optional(),
})

function loadEnv() {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const result = partialEnvSchema.safeParse(process.env)
    if (!result.success) {
      console.error('Environment validation failed:', result.error.format())
      process.exit(1)
    }
    return result.data
  }

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Environment validation failed:', result.error.format())
    process.exit(1)
  }
  return result.data
}

export const env = loadEnv()
export type Env = z.infer<typeof envSchema>
