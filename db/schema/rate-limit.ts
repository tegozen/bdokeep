import { index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/** Shared IP/login rate-limit hits (survives multi-worker Nitro). */
export const rateLimitHits = pgTable(
  'rate_limit_hits',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    rateKey: text('rate_key').notNull(),
    hitAt: timestamp('hit_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('rate_limit_hits_key_time_idx').using(
      'btree',
      table.rateKey.asc().nullsLast().op('text_ops'),
      table.hitAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
)
