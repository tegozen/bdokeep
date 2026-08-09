import {
  check,
  foreignKey,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { classes } from './classes.ts'

export const guideFeedback = pgTable(
  'guide_feedback',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    classId: uuid('class_id'),
    classSlug: text('class_slug'),
    body: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('guide_feedback_class_idx').using(
      'btree',
      table.classSlug.asc().nullsLast().op('text_ops'),
      table.createdAt.desc().nullsFirst().op('text_ops'),
    ),
    index('guide_feedback_created_idx').using(
      'btree',
      table.createdAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'guide_feedback_class_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    check('guide_feedback_body_len', sql`(char_length(body) >= 1) AND (char_length(body) <= 2000)`),
  ],
)

export const guideProposals = pgTable(
  'guide_proposals',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    classId: uuid('class_id').notNull(),
    classSlug: text('class_slug').notNull(),
    section: text().notNull(),
    payload: jsonb().default({}).notNull(),
    authorLabel: text('author_label'),
    status: text().default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    reviewNote: text('review_note'),
  },
  (table) => [
    index('guide_proposals_class_idx').using(
      'btree',
      table.classId.asc().nullsLast().op('timestamptz_ops'),
      table.createdAt.desc().nullsFirst().op('uuid_ops'),
    ),
    index('guide_proposals_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('timestamptz_ops'),
      table.createdAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'guide_proposals_class_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('bdokeep_app_all', {
      as: 'permissive',
      for: 'all',
      to: ['bdokeep_app'],
      using: sql`true`,
      withCheck: sql`true`,
    }),
    check(
      'guide_proposals_status_check',
      sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`,
    ),
    check(
      'guide_proposals_section_check',
      sql`section = ANY (ARRAY['summary_awakening'::text, 'summary_succession'::text, 'buffs'::text, 'combo_awakening'::text, 'combo_succession'::text, 'crystals'::text, 'relics'::text, 'hardening'::text, 'videos_awakening'::text, 'videos_succession'::text, 'morphs'::text])`,
    ),
  ],
)
