import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { env } from '../config/env'

const connectionString = env.DATABASE_URL

export const sql = connectionString ? postgres(connectionString) : null
export const db = sql ? drizzle(sql, { schema }) : null

export function getDb() {
  if (!db) {
    throw new Error('Database not configured. Please set DATABASE_URL environment variable.')
  }
  return db
}
