import { isCrystalPresetId } from '@domain'
import { replacedForApply } from '../shared/replacedPresets'
import type { ApplySectionContext } from './types'

export async function applyRelics(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, payload } = ctx
  const rawRelics = Array.isArray(payload.relics) ? payload.relics : []
  const rawLights = Array.isArray(payload.lightstones) ? payload.lightstones : []

  const relicRows = rawRelics.map((entry, i) => {
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

  const lightRows = rawLights.map((entry, i) => {
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
    [...relicRows.map((r) => r.preset), ...lightRows.map((r) => r.preset)],
    isCrystalPresetId,
  )

  await tx`
    delete from guide_relics
    where guide_id = ${guide.id} and preset = any(${replaced}::text[])
  `
  await tx`
    delete from guide_lightstones
    where guide_id = ${guide.id} and preset = any(${replaced}::text[])
  `

  if (relicRows.length) {
    await tx`
      insert into guide_relics ${tx(relicRows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
    `
  }
  if (lightRows.length) {
    await tx`
      insert into guide_lightstones ${tx(lightRows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
    `
  }
}
