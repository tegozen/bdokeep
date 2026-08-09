import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/** Legacy migrate.sh ledger; kept for existing volumes. New apply uses drizzle.__drizzle_migrations. */
export const schemaMigrations = pgTable('schema_migrations', {
  filename: text().primaryKey().notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})
