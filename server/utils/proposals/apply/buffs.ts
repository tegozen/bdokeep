import { isCrystalPresetId } from '@domain'
import { replacedForApply } from '../shared/replacedPresets'
import type { ApplySectionContext } from './types'

export async function applyBuffs(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, payload } = ctx
  const rawBuffs = Array.isArray(payload.buffs) ? payload.buffs : []
  const rows = rawBuffs.map((entry, i) => {
    const e = entry as {
      preset?: unknown
      buff_id?: unknown
      sort_order?: unknown
    }
    return {
      guide_id: guide.id,
      buff_id: String(e.buff_id || ''),
      preset: String(e.preset || 't1'),
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
    }
  })
  const replaced = replacedForApply(
    payload.replaced_presets,
    rows.map((r) => r.preset),
    isCrystalPresetId,
  )

  await tx`
    delete from guide_buffs
    where guide_id = ${guide.id} and preset = any(${replaced}::text[])
  `
  if (rows.length) {
    await tx`
      insert into guide_buffs ${tx(rows, 'guide_id', 'buff_id', 'preset', 'sort_order')}
    `
  }
}
