import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

/**
 * Schema migrations via Drizzle Kit.
 * Prefer MIGRATE_DATABASE_URL (superuser) for migrate/pull; fall back to DATABASE_URL.
 */
const url = (
  process.env.MIGRATE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ''
).trim()

if (!url) {
  throw new Error('Set MIGRATE_DATABASE_URL or DATABASE_URL for drizzle-kit')
}

export default defineConfig({
  schema: './db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
