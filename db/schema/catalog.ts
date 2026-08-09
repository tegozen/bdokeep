import {
  boolean,
  check,
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
import { itemType } from './enums.ts'

export const items = pgTable(
  'items',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codexId: text('codex_id'),
    nameRu: text('name_ru').notNull(),
    iconUrl: text('icon_url'),
    itemType: itemType('item_type').default('other').notNull(),
    raw: jsonb().default({}).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('items_type_idx').using('btree', table.itemType.asc().nullsLast().op('enum_ops')),
    unique('items_codex_id_key').on(table.codexId),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read items', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
  ],
)

export const buffs = pgTable(
  'buffs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codexId: text('codex_id'),
    nameRu: text('name_ru').notNull(),
    iconUrl: text('icon_url'),
    description: text(),
    raw: jsonb().default({}).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    unique('buffs_codex_id_key').on(table.codexId),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read buffs', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
  ],
)

export const skills = pgTable(
  'skills',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codexId: text('codex_id'),
    nameRu: text('name_ru').notNull(),
    iconUrl: text('icon_url'),
    classSlug: text('class_slug'),
    skillType: text('skill_type'),
    levelReq: integer('level_req'),
    raw: jsonb().default({}).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    supportsAddon: boolean('supports_addon').default(false).notNull(),
    addonTier: smallint('addon_tier').default(2).notNull(),
    addonEffectKeys: text('addon_effect_keys').array().default(['']).notNull(),
  },
  (table) => [
    index('skills_class_slug_idx').using('btree', table.classSlug.asc().nullsLast().op('text_ops')),
    unique('skills_codex_id_key').on(table.codexId),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read skills', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('skills_addon_tier_check', sql`addon_tier = ANY (ARRAY[1, 2, 3])`),
  ],
)

export const skillAddonEffects = pgTable(
  'skill_addon_effects',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    key: text().notNull(),
    nameRu: text('name_ru').notNull(),
    effectGroup: text('effect_group').notNull(),
    tierLabels: jsonb('tier_labels').default({}).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('skill_addon_effects_sort_idx').using(
      'btree',
      table.sortOrder.asc().nullsLast().op('int4_ops'),
      table.nameRu.asc().nullsLast().op('int4_ops'),
    ),
    unique('skill_addon_effects_key_key').on(table.key),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read skill_addon_effects', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
  ],
)

export const lightstoneSets = pgTable(
  'lightstone_sets',
  {
    id: text().primaryKey().notNull(),
    nameRu: text('name_ru').notNull(),
    nameEn: text('name_en'),
    category: text().notNull(),
    bonuses: jsonb().default([]).notNull(),
    normalCodexIds: text('normal_codex_ids').array().notNull(),
    enhancedCodexIds: text('enhanced_codex_ids').array().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  () => [
    check(
      'lightstone_sets_category_check',
      sql`category = ANY (ARRAY['combat'::text, 'lifeskill'::text])`,
    ),
  ],
)
