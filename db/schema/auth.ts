import {
  check,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/** App moderators (JWT login). Not Postgres roles. */
export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    username: text().notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text().notNull(),
    disabledAt: timestamp('disabled_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('admin_users_username_lower_uidx').using(
      'btree',
      sql`lower(${table.username})`,
    ),
    index('admin_users_role_idx').using('btree', table.role.asc().nullsLast().op('text_ops')),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    check(
      'admin_users_role_check',
      sql`role = ANY (ARRAY['superadmin'::text, 'admin'::text])`,
    ),
    check(
      'admin_users_username_len',
      sql`(char_length(username) >= 2) AND (char_length(username) <= 64)`,
    ),
    check(
      'admin_users_password_hash_len',
      sql`char_length(password_hash) >= 20`,
    ),
  ],
)
