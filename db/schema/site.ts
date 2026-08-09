import {
  boolean,
  check,
  customType,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const guildRecruitBanner = pgTable(
  'guild_recruit_banner',
  {
    id: boolean().default(true).primaryKey().notNull(),
    enabled: boolean().default(false).notNull(),
    body: text().default('').notNull(),
    iconMime: text('icon_mime'),
    iconBytes: bytea('icon_bytes'),
    links: jsonb().default([]).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  () => [
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    check('guild_recruit_banner_id_check', sql`id`),
    check(
      'guild_recruit_banner_body_len',
      sql`(char_length(body) >= 0) AND (char_length(body) <= 4000)`,
    ),
    check('guild_recruit_banner_links_array', sql`jsonb_typeof(links) = 'array'::text`),
  ],
)
