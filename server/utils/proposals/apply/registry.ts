import { createError } from 'h3'
import {
  isBuffsSection,
  isComboSection,
  isCrystalsSection,
  isHardeningSection,
  isMorphsSection,
  isRelicsSection,
  isSummarySection,
  isVideosSection,
  type ProposalSection,
} from '@domain'
import { applyBuffs } from './buffs'
import { applyCombo } from './combo'
import { applyCrystals } from './crystals'
import { applyHardening } from './hardening'
import { applyMorphs } from './morphs'
import { applyRelics } from './relics'
import { applySummary } from './summary'
import type { ApplySectionContext } from './types'
import { applyVideos } from './videos'

type ApplyHandler = (ctx: ApplySectionContext) => Promise<void>

const entries: Array<{
  match: (section: ProposalSection) => boolean
  handle: ApplyHandler
}> = [
  { match: isComboSection, handle: applyCombo },
  { match: isBuffsSection, handle: applyBuffs },
  { match: isCrystalsSection, handle: applyCrystals },
  { match: isRelicsSection, handle: applyRelics },
  { match: isHardeningSection, handle: applyHardening },
  { match: isVideosSection, handle: applyVideos },
  { match: isMorphsSection, handle: applyMorphs },
  { match: isSummarySection, handle: applySummary },
]

export async function dispatchApplySection(ctx: ApplySectionContext): Promise<void> {
  const entry = entries.find((e) => e.match(ctx.section))
  if (!entry) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
  }
  await entry.handle(ctx)
}
