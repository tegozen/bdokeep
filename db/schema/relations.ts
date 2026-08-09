import { relations } from 'drizzle-orm/relations'
import { buffs, items, skillAddonEffects, skills } from './catalog.ts'
import { classGuides, classes, classVideos } from './classes.ts'
import { guideComboSteps, guideCombos } from './guide-combos.ts'
import {
  guideBuffs,
  guideCrystals,
  guideEssence,
  guideLightstones,
  guideMorphs,
  guideRelics,
} from './guide-presets.ts'
import { guideFeedback, guideProposals } from './moderation.ts'

export const classVideosRelations = relations(classVideos, ({ one }) => ({
  class: one(classes, {
    fields: [classVideos.classId],
    references: [classes.id],
  }),
}))

export const classesRelations = relations(classes, ({ many }) => ({
  classVideos: many(classVideos),
  classGuides: many(classGuides),
  guideFeedbacks: many(guideFeedback),
  guideProposals: many(guideProposals),
}))

export const classGuidesRelations = relations(classGuides, ({ one, many }) => ({
  class: one(classes, {
    fields: [classGuides.classId],
    references: [classes.id],
  }),
  guideEssences: many(guideEssence),
  guideCrystals: many(guideCrystals),
  guideComboSteps: many(guideComboSteps),
  guideRelics: many(guideRelics),
  guideBuffs: many(guideBuffs),
  guideLightstones: many(guideLightstones),
  guideMorphs: many(guideMorphs),
  guideCombos: many(guideCombos),
}))

export const guideEssenceRelations = relations(guideEssence, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideEssence.guideId],
    references: [classGuides.id],
  }),
  item: one(items, {
    fields: [guideEssence.itemId],
    references: [items.id],
  }),
}))

export const itemsRelations = relations(items, ({ many }) => ({
  guideEssences: many(guideEssence),
  guideCrystals: many(guideCrystals),
  guideRelics: many(guideRelics),
  guideLightstones: many(guideLightstones),
}))

export const guideCrystalsRelations = relations(guideCrystals, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideCrystals.guideId],
    references: [classGuides.id],
  }),
  item: one(items, {
    fields: [guideCrystals.itemId],
    references: [items.id],
  }),
}))

export const guideComboStepsRelations = relations(guideComboSteps, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideComboSteps.guideId],
    references: [classGuides.id],
  }),
  skill: one(skills, {
    fields: [guideComboSteps.skillId],
    references: [skills.id],
  }),
  guideCombo: one(guideCombos, {
    fields: [guideComboSteps.comboId],
    references: [guideCombos.id],
  }),
}))

export const skillsRelations = relations(skills, ({ many }) => ({
  guideComboSteps: many(guideComboSteps),
  guideMorphs: many(guideMorphs),
}))

export const guideCombosRelations = relations(guideCombos, ({ one, many }) => ({
  guideComboSteps: many(guideComboSteps),
  classGuide: one(classGuides, {
    fields: [guideCombos.guideId],
    references: [classGuides.id],
  }),
}))

export const guideRelicsRelations = relations(guideRelics, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideRelics.guideId],
    references: [classGuides.id],
  }),
  item: one(items, {
    fields: [guideRelics.itemId],
    references: [items.id],
  }),
}))

export const guideBuffsRelations = relations(guideBuffs, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideBuffs.guideId],
    references: [classGuides.id],
  }),
  buff: one(buffs, {
    fields: [guideBuffs.buffId],
    references: [buffs.id],
  }),
}))

export const buffsRelations = relations(buffs, ({ many }) => ({
  guideBuffs: many(guideBuffs),
}))

export const guideLightstonesRelations = relations(guideLightstones, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideLightstones.guideId],
    references: [classGuides.id],
  }),
  item: one(items, {
    fields: [guideLightstones.itemId],
    references: [items.id],
  }),
}))

export const guideMorphsRelations = relations(guideMorphs, ({ one }) => ({
  classGuide: one(classGuides, {
    fields: [guideMorphs.guideId],
    references: [classGuides.id],
  }),
  skill: one(skills, {
    fields: [guideMorphs.skillId],
    references: [skills.id],
  }),
  skillAddonEffect_effectId1: one(skillAddonEffects, {
    fields: [guideMorphs.effectId1],
    references: [skillAddonEffects.id],
    relationName: 'guideMorphs_effectId1_skillAddonEffects_id',
  }),
  skillAddonEffect_effectId2: one(skillAddonEffects, {
    fields: [guideMorphs.effectId2],
    references: [skillAddonEffects.id],
    relationName: 'guideMorphs_effectId2_skillAddonEffects_id',
  }),
}))

export const skillAddonEffectsRelations = relations(skillAddonEffects, ({ many }) => ({
  guideMorphs_effectId1: many(guideMorphs, {
    relationName: 'guideMorphs_effectId1_skillAddonEffects_id',
  }),
  guideMorphs_effectId2: many(guideMorphs, {
    relationName: 'guideMorphs_effectId2_skillAddonEffects_id',
  }),
}))

export const guideFeedbackRelations = relations(guideFeedback, ({ one }) => ({
  class: one(classes, {
    fields: [guideFeedback.classId],
    references: [classes.id],
  }),
}))

export const guideProposalsRelations = relations(guideProposals, ({ one }) => ({
  class: one(classes, {
    fields: [guideProposals.classId],
    references: [classes.id],
  }),
}))
