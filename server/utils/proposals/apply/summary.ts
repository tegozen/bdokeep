import { classSummaryField, summaryModeFromSection } from '@domain'
import type { ApplySectionContext } from './types'

export async function applySummary(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, section, payload } = ctx
  const text = String(payload.text || '').trim()
  const rawKind = payload.kind == null ? 'pvp' : String(payload.kind)
  const kind = rawKind === 'pve' ? 'pve' : 'pvp'
  const mode = summaryModeFromSection(section)
  const summaryCol = classSummaryField(kind, mode)
  await tx`
    update class_guides
    set ${tx(summaryCol)} = ${text}
    where id = ${guide.id}
  `
}
