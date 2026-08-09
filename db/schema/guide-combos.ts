import {
  check,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { skills } from './catalog.ts'
import { classGuides } from './classes.ts'

export const guideCombos = pgTable(
  'guide_combos',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    mode: text().notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    title: text(),
    notes: text(),
    kind: text().default('pvp').notNull(),
  },
  (table) => [
    index('guide_combos_guide_mode_kind_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('uuid_ops'),
      table.mode.asc().nullsLast().op('int4_ops'),
      table.kind.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_combos_guide_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_combos', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
    check('guide_combos_mode_check', sql`mode = ANY (ARRAY['awakening'::text, 'succession'::text])`),
    check('guide_combos_title_len', sql`(title IS NULL) OR (char_length(title) <= 60)`),
    check('guide_combos_notes_len', sql`(notes IS NULL) OR (char_length(notes) <= 500)`),
    check('guide_combos_kind_check', sql`kind = ANY (ARRAY['pvp'::text, 'pve'::text])`),
  ],
)

export const guideComboSteps = pgTable(
  'guide_combo_steps',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    guideId: uuid('guide_id').notNull(),
    skillId: uuid('skill_id').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    comboId: uuid('combo_id').notNull(),
  },
  (table) => [
    index('guide_combo_steps_combo_idx').using(
      'btree',
      table.comboId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('int4_ops'),
    ),
    index('guide_combo_steps_guide_idx').using(
      'btree',
      table.guideId.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guideId],
      foreignColumns: [classGuides.id],
      name: 'guide_combo_steps_guide_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.skillId],
      foreignColumns: [skills.id],
      name: 'guide_combo_steps_skill_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.comboId],
      foreignColumns: [guideCombos.id],
      name: 'guide_combo_steps_combo_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy('Public read guide_combo_steps', {
      as: 'permissive',
      for: 'select',
      to: ['anon', 'authenticated'],
    }),
  ],
)
