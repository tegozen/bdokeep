import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const classes = pgTable(
  'classes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    slug: text().notNull(),
    nameRu: text('name_ru').notNull(),
    iconUrl: text('icon_url'),
    portraitUrl: text('portrait_url'),
    awakeningName: text('awakening_name'),
    successionName: text('succession_name'),
    sortOrder: integer('sort_order').default(0).notNull(),
    published: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    tierPvpAwakening: smallint('tier_pvp_awakening'),
    tierPvpSuccession: smallint('tier_pvp_succession'),
    tierPveAwakening: smallint('tier_pve_awakening'),
    tierPveSuccession: smallint('tier_pve_succession'),
  },
  (table) => [
    index('classes_published_sort_idx').using(
      'btree',
      table.published.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('int4_ops'),
    ),
    unique('classes_slug_key').on(table.slug),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read published classes', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check(
      'classes_tier_pvp_awakening_check',
      sql`(tier_pvp_awakening IS NULL) OR ((tier_pvp_awakening >= 1) AND (tier_pvp_awakening <= 5))`,
    ),
    check(
      'classes_tier_pvp_succession_check',
      sql`(tier_pvp_succession IS NULL) OR ((tier_pvp_succession >= 1) AND (tier_pvp_succession <= 5))`,
    ),
    check(
      'classes_tier_pve_awakening_check',
      sql`(tier_pve_awakening IS NULL) OR ((tier_pve_awakening >= 1) AND (tier_pve_awakening <= 5))`,
    ),
    check(
      'classes_tier_pve_succession_check',
      sql`(tier_pve_succession IS NULL) OR ((tier_pve_succession >= 1) AND (tier_pve_succession <= 5))`,
    ),
  ],
)

export const classVideos = pgTable(
  'class_videos',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    classId: uuid('class_id').notNull(),
    title: text().notNull(),
    youtubeUrl: text('youtube_url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    mode: text().default('awakening').notNull(),
    status: text().default('ready').notNull(),
    statusSince: timestamp('status_since', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('class_videos_class_idx').using(
      'btree',
      table.classId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('int4_ops'),
    ),
    index('class_videos_processing_idx')
      .using('btree', table.statusSince.asc().nullsLast().op('timestamptz_ops'))
      .where(sql`(status = 'processing'::text)`),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'class_videos_class_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read videos of published classes', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('class_videos_mode_check', sql`mode = ANY (ARRAY['awakening'::text, 'succession'::text])`),
    check('class_videos_status_check', sql`status = ANY (ARRAY['ready'::text, 'processing'::text])`),
  ],
)

export const classGuides = pgTable(
  'class_guides',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    classId: uuid('class_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    sectionUpdates: jsonb('section_updates').default({}).notNull(),
    comboAwakening: text('combo_awakening'),
    comboSuccession: text('combo_succession'),
    summaryPvpAwakening: text('summary_pvp_awakening'),
    summaryPvpSuccession: text('summary_pvp_succession'),
    summaryPveAwakening: text('summary_pve_awakening'),
    summaryPveSuccession: text('summary_pve_succession'),
  },
  (table) => [
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'class_guides_class_id_fkey',
    }).onDelete('cascade'),
    unique('class_guides_class_id_key').on(table.classId),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guides of published classes', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
  ],
)
