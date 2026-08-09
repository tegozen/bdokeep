import { comboModeFromSection } from '@domain'
import { comboKindFromPayload } from '../shared/comboKind'
import type { ApplySectionContext } from './types'

export async function applyCombo(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, section, payload } = ctx
  const mode = comboModeFromSection(section)
  const kind = comboKindFromPayload(payload)
  type ComboEntry = { title?: unknown; notes?: unknown; skill_ids?: unknown }
  let rawCombos: ComboEntry[] = []
  if (Array.isArray(payload.combos)) {
    rawCombos = payload.combos as ComboEntry[]
  } else if (Array.isArray(payload.skill_ids)) {
    rawCombos = [{ skill_ids: payload.skill_ids }]
  }

  await tx`
    delete from guide_combos
    where guide_id = ${guide.id} and mode = ${mode} and kind = ${kind}
  `

  for (let ci = 0; ci < rawCombos.length; ci++) {
    const entry = rawCombos[ci]!
    const skillIds = Array.isArray(entry.skill_ids)
      ? entry.skill_ids.map((x) => String(x))
      : []
    if (!skillIds.length) continue
    const title = String(entry.title ?? '').trim() || null
    const notes = String(entry.notes ?? '').trim() || null
    const inserted = await tx`
      insert into guide_combos (guide_id, mode, kind, sort_order, title, notes)
      values (${guide.id}, ${mode}, ${kind}, ${ci}, ${title}, ${notes})
      returning id
    `
    const comboId = inserted[0]?.id
    if (!comboId) continue
    const rows = skillIds.map((skill_id, i) => ({
      guide_id: guide.id,
      combo_id: comboId,
      skill_id,
      sort_order: i,
    }))
    await tx`
      insert into guide_combo_steps ${tx(rows, 'guide_id', 'combo_id', 'skill_id', 'sort_order')}
    `
  }
}
