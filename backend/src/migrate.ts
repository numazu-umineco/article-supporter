import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import 'dotenv/config'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(__dirname, '..', 'drizzle')

const sql = postgres(databaseUrl, { max: 1 })
const db = drizzle(sql)

console.log('Running migrations...')
await migrate(db, { migrationsFolder })
console.log('Migrations completed successfully')

await sql.end()
