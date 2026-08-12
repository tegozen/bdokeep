import { createError } from 'h3'
import {
  comboModeFromSection,
  isBuffsSection,
  isComboSection,
  isCrystalsSection,
  isHardeningSection,
  isMorphsSection,
  isMorphPresetId,
  isRelicsSection,
  isSummarySection,
  isVideosSection,
  isCrystalPresetId,
  type ProposalSection,
} from '@domain'
import type { Sql } from './db'
import { comboKindFromPayload } from './proposals/shared/comboKind'
import { replacedForApply } from './proposals/shared/replacedPresets'

function isEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length === 0
}

/** Parsed payload would replace section content with nothing (catalog prune path). */
export function isEmptyApplyPayload(
  section: ProposalSection,
  payload: Record<string, unknown>,
): boolean {
  if (isComboSection(section)) return isEmptyArray(payload.combos)
  if (isCrystalsSection(section)) return isEmptyArray(payload.crystals)
  if (isBuffsSection(section)) return isEmptyArray(payload.buffs)
  if (isHardeningSection(section)) return isEmptyArray(payload.hardening)
  if (isMorphsSection(section)) return isEmptyArray(payload.morphs)
  if (isRelicsSection(section)) {
    return isEmptyArray(payload.relics) && isEmptyArray(payload.lightstones)
  }
  if (isVideosSection(section)) return isEmptyArray(payload.videos)
  if (isSummarySection(section)) return false
  return false
}

async function guideIdForClass(sql: Sql, classId: string): Promise<string | null> {
  const rows = await sql`
    select id from class_guides where class_id = ${classId} limit 1
  `
  return rows[0]?.id ? String(rows[0].id) : null
}

async function sectionHasLiveContent(
  sql: Sql,
  guideId: string,
  section: ProposalSection,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (isComboSection(section)) {
    const mode = comboModeFromSection(section)
    const kind = comboKindFromPayload(payload)
    const rows = await sql`
      select 1 from guide_combos
      where guide_id = ${guideId} and mode = ${mode} and kind = ${kind}
      limit 1
    `
    return rows.length > 0
  }

  if (isCrystalsSection(section)) {
    const replaced = replacedForApply(payload.replaced_presets, [], isCrystalPresetId)
    if (!replaced.length) return false
    const rows = await sql`
      select 1 from guide_crystals
      where guide_id = ${guideId} and preset = any(${replaced}::text[])
      limit 1
    `
    return rows.length > 0
  }

  if (isBuffsSection(section)) {
    const replaced = replacedForApply(payload.replaced_presets, [], isCrystalPresetId)
    if (!replaced.length) return false
    const rows = await sql`
      select 1 from guide_buffs
      where guide_id = ${guideId} and preset = any(${replaced}::text[])
      limit 1
    `
    return rows.length > 0
  }

  if (isHardeningSection(section)) {
    const replaced = replacedForApply(payload.replaced_presets, [], isCrystalPresetId)
    if (!replaced.length) return false
    const rows = await sql`
      select 1 from guide_essence
      where guide_id = ${guideId} and preset = any(${replaced}::text[])
      limit 1
    `
    return rows.length > 0
  }

  if (isMorphsSection(section)) {
    const replaced = replacedForApply(payload.replaced_presets, [], isMorphPresetId)
    if (!replaced.length) return false
    const rows = await sql`
      select 1 from guide_morphs
      where guide_id = ${guideId} and preset = any(${replaced}::text[])
      limit 1
    `
    return rows.length > 0
  }

  if (isRelicsSection(section)) {
    const replaced = replacedForApply(payload.replaced_presets, [], isCrystalPresetId)
    if (!replaced.length) return false
    const relicRows = await sql`
      select 1 from guide_relics
      where guide_id = ${guideId} and preset = any(${replaced}::text[])
      limit 1
    `
    if (relicRows.length) return true
    const lightRows = await sql`
      select 1 from guide_lightstones
      where guide_id = ${guideId} and preset = any(${replaced}::text[])
      limit 1
    `
    return lightRows.length > 0
  }

  if (isVideosSection(section)) {
    const mode = section === 'videos_succession' ? 'succession' : 'awakening'
    const rows = await sql`
      select 1 from class_videos
      where class_id = (
        select class_id from class_guides where id = ${guideId} limit 1
      ) and mode = ${mode}
      limit 1
    `
    return rows.length > 0
  }

  return false
}

/**
 * Block approve/reapply when catalog prune reduced payload to empty but live section still has data.
 * Skipped for allowEmptyVideos (cron video cleanup).
 */
export async function assertNotDestructiveApply(
  sql: Sql,
  classId: string,
  section: ProposalSection,
  payload: Record<string, unknown>,
  opts?: { allowEmptyVideos?: boolean },
) {
  if (opts?.allowEmptyVideos && isVideosSection(section)) return
  if (!isEmptyApplyPayload(section, payload)) return

  const guideId = await guideIdForClass(sql, classId)
  if (!guideId) return

  const hasLive = await sectionHasLiveContent(sql, guideId, section, payload)
  if (hasLive) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Каталог изменился: заявка обнулила бы раздел. Отклоните или отредактируйте заявку.',
    })
  }
}
