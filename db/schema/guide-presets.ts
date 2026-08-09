import {
  check,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { buffs, items, skillAddonEffects, skills } from './catalog.ts'
import { classGuides } from './classes.ts'

const presetCheck = sql`preset = ANY (ARRAY['t1'::text, 't2'::text, 'besp'::text, 'sub'::text, 'pve'::text])`

export const guideEssence = pgTable(
  'guide_essence',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    itemId: uuid('item_id'),
    slot: text(),
    notes: text(),
    sortOrder: integer('sort_order').default(0).notNull(),
    preset: text().default('t1').notNull(),
  },
  (table) => [
    index('guide_essence_guide_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    index('guide_essence_guide_preset_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('text_ops'),
      table.preset.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_essence_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [items.id],
      name: 'guide_essence_item_id_fkey',
    }).onDelete('set null'),
    unique('guide_essence_guide_preset_slot_key').on(table.guideId, table.slot, table.preset),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_essence', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_essence_preset_check', presetCheck),
  ],
)

export const guideCrystals = pgTable(
  'guide_crystals',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    itemId: uuid('item_id'),
    slot: text(),
    notes: text(),
    sortOrder: integer('sort_order').default(0).notNull(),
    preset: text().default('t1').notNull(),
  },
  (table) => [
    index('guide_crystals_guide_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    index('guide_crystals_guide_preset_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.preset.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_crystals_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [items.id],
      name: 'guide_crystals_item_id_fkey',
    }).onDelete('set null'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_crystals', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_crystals_preset_check', presetCheck),
  ],
)

export const guideRelics = pgTable(
  'guide_relics',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    itemId: uuid('item_id'),
    slot: text(),
    notes: text(),
    sortOrder: integer('sort_order').default(0).notNull(),
    preset: text().default('t1').notNull(),
  },
  (table) => [
    index('guide_relics_guide_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    index('guide_relics_guide_preset_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.preset.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_relics_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [items.id],
      name: 'guide_relics_item_id_fkey',
    }).onDelete('set null'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_relics', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_relics_preset_check', presetCheck),
  ],
)

export const guideBuffs = pgTable(
  'guide_buffs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    buffId: uuid('buff_id'),
    slot: text(),
    groupName: text('group_name'),
    notes: text(),
    sortOrder: integer('sort_order').default(0).notNull(),
    preset: text().default('t1').notNull(),
  },
  (table) => [
    index('guide_buffs_guide_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    index('guide_buffs_guide_preset_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.preset.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_buffs_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.buffId],
      foreignColumns: [buffs.id],
      name: 'guide_buffs_buff_id_fkey',
    }).onDelete('set null'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_buffs', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_buffs_preset_check', presetCheck),
  ],
)

export const guideLightstones = pgTable(
  'guide_lightstones',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    itemId: uuid('item_id'),
    slot: text(),
    notes: text(),
    sortOrder: integer('sort_order').default(0).notNull(),
    preset: text().default('t1').notNull(),
  },
  (table) => [
    index('guide_lightstones_guide_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    index('guide_lightstones_guide_preset_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('int4_ops'),
      table.preset.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_lightstones_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [items.id],
      name: 'guide_lightstones_item_id_fkey',
    }).onDelete('set null'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_lightstones', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_lightstones_preset_check', presetCheck),
  ],
)

export const guideMorphs = pgTable(
  'guide_morphs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    preset: text().notNull(),
    slotLevel: integer('slot_level').notNull(),
    skillId: uuid('skill_id').notNull(),
    effectId1: uuid('effect_id_1'),
    effectId2: uuid('effect_id_2'),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('guide_morphs_guide_preset_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('text_ops'),
      table.preset.asc().nullsLast().op('uuid_ops'),
      table.slotLevel.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_morphs_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.skillId],
      foreignColumns: [skills.id],
      name: 'guide_morphs_skill_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.effectId1],
      foreignColumns: [skillAddonEffects.id],
      name: 'guide_morphs_effect_id_1_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.effectId2],
      foreignColumns: [skillAddonEffects.id],
      name: 'guide_morphs_effect_id_2_fkey',
    }).onDelete('set null'),
    unique('guide_morphs_guide_id_preset_slot_level_key').on(
      table.guideId,
      table.preset,
      table.slotLevel,
    ),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_morphs', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_morphs_slot_level_check', sql`slot_level = ANY (ARRAY[50, 52, 54, 56, 58, 60])`),
    check(
      'guide_morphs_preset_check',
      sql`preset = ANY (ARRAY['aw_t1'::text, 'aw_t2'::text, 'aw_besp'::text, 'aw_sub'::text, 'aw_pve'::text, 'succ_t1'::text, 'succ_t2'::text, 'succ_besp'::text, 'succ_sub'::text, 'succ_pve'::text])`,
    ),
  ],
)
