import { isMorphPresetId } from '@domain'
import { replacedForApply } from '../shared/replacedPresets'
import type { ApplySectionContext } from './types'

export async function applyMorphs(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, payload } = ctx
  const raw = Array.isArray(payload.morphs) ? payload.morphs : []
  const rows = raw.map((entry, i) => {
    const e = entry as {
      preset?: unknown
      slot_level?: unknown
      skill_id?: unknown
      effect_ids?: unknown
      sort_order?: unknown
    }
    const effectIds = Array.isArray(e.effect_ids) ? e.effect_ids.map((x) => String(x)) : []
    return {
      guide_id: guide.id,
      preset: String(e.preset || ''),
      slot_level: Number(e.slot_level),
      skill_id: String(e.skill_id || ''),
      effect_id_1: effectIds[0]!,
      effect_id_2: effectIds[1]!,
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
    }
  })
  const replaced = replacedForApply(
    payload.replaced_presets,
    rows.map((r) => r.preset),
    isMorphPresetId,
  )

  await tx`
    delete from guide_morphs
    where guide_id = ${guide.id} and preset = any(${replaced}::text[])
  `
  if (rows.length) {
    await tx`
      insert into guide_morphs ${tx(
        rows,
        'guide_id',
        'preset',
        'slot_level',
        'skill_id',
        'effect_id_1',
        'effect_id_2',
        'sort_order',
      )}
    `
  }
}
