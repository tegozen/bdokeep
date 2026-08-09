import { classSummaryField, summaryModeFromSection } from '@domain'
import { comboKindFromPayload } from '../shared/comboKind'
import type { ApplySectionContext } from './types'

export async function applySummary(ctx: ApplySectionContext): Promise<void> {
  const { tx, guide, section, payload } = ctx
  const text = String(payload.text || '').trim()
  const kind = comboKindFromPayload(payload)
  const mode = summaryModeFromSection(section)
  const summaryCol = classSummaryField(kind, mode)
  await tx`
    update class_guides
    set ${tx(summaryCol)} = ${text}
    where id = ${guide.id}
  `
}
