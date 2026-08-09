import { isCrystalPresetId } from '@domain'
import { replacedForApply } from '../shared/replacedPresets'
import type { ApplySectionContext } from './types'

export async function applyCrystals(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, payload } = ctx
  const raw = Array.isArray(payload.crystals) ? payload.crystals : []
  const rows = raw.map((entry, i) => {
    const e = entry as {
      preset?: unknown
      slot?: unknown
      item_id?: unknown
      sort_order?: unknown
    }
    return {
      guide_id: guide.id,
      item_id: String(e.item_id || ''),
      slot: String(e.slot || ''),
      preset: String(e.preset || ''),
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
    }
  })
  const replaced = replacedForApply(
    payload.replaced_presets,
    rows.map((r) => r.preset),
    isCrystalPresetId,
  )

  await tx`
    delete from guide_crystals
    where guide_id = ${guide.id} and preset = any(${replaced}::text[])
  `
  if (rows.length) {
    await tx`
      insert into guide_crystals ${tx(rows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
    `
  }
}
