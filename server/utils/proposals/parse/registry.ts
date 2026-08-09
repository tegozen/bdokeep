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
import { parseBuffs } from './buffs'
import { parseCombo } from './combo'
import { parseCrystals } from './crystals'
import { parseHardening } from './hardening'
import { parseMorphs } from './morphs'
import { parseRelics } from './relics'
import { parseSummary } from './summary'
import type { ParseSectionContext, ParsedProposalPayload } from './types'
import { parseVideos } from './videos'

type ParseHandler = (ctx: ParseSectionContext) => Promise<ParsedProposalPayload>

const entries: Array<{
  match: (section: ProposalSection) => boolean
  handle: ParseHandler
}> = [
  { match: isComboSection, handle: parseCombo },
  { match: isBuffsSection, handle: parseBuffs },
  { match: isCrystalsSection, handle: parseCrystals },
  { match: isRelicsSection, handle: parseRelics },
  { match: isHardeningSection, handle: parseHardening },
  { match: isVideosSection, handle: parseVideos },
  { match: isMorphsSection, handle: parseMorphs },
  { match: isSummarySection, handle: parseSummary },
]

export async function dispatchParseSection(
  ctx: ParseSectionContext,
): Promise<ParsedProposalPayload> {
  const entry = entries.find((e) => e.match(ctx.section))
  if (!entry) {
    throw createError({ statusCode: 400, statusMessage: 'Неизвестная секция' })
  }
  return entry.handle(ctx)
}
