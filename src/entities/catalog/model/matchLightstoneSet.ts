import type { LightstoneSet } from './types'
import { LIGHTSTONE_SLOT_IDS } from './relicSlots'

export type MatchedLightstoneSet = {
  id: string
  name_ru: string
  variant: 'normal' | 'enhanced'
}

function sameIdBag(a: string[], b: string[]) {
  if (a.length !== b.length || a.length === 0) return false
  const counts = new Map<string, number>()
  for (const id of a) counts.set(id, (counts.get(id) || 0) + 1)
  for (const id of b) {
    const n = counts.get(id)
    if (!n) return false
    if (n === 1) counts.delete(id)
    else counts.set(id, n - 1)
  }
  return counts.size === 0
}

/** Match filled lightstone slots to a catalog set (normal or enhanced). */
export function matchLightstoneSet(
  filled: Record<string, { id: string } | null | undefined>,
  sets: readonly LightstoneSet[],
): MatchedLightstoneSet | null {
  const ids = LIGHTSTONE_SLOT_IDS.map((slot) => filled[slot]?.id).filter(
    (id): id is string => Boolean(id),
  )
  if (!ids.length) return null

  for (const set of sets) {
    const enhancedIds = set.enhanced.map((s) => s.id)
    if (sameIdBag(ids, enhancedIds)) {
      return { id: set.id, name_ru: set.name_ru, variant: 'enhanced' }
    }
    const normalIds = set.normal.map((s) => s.id)
    if (sameIdBag(ids, normalIds)) {
      return { id: set.id, name_ru: set.name_ru, variant: 'normal' }
    }
  }
  return null
}

export function formatLightstoneSetLabel(
  match: MatchedLightstoneSet | null | undefined,
): string | null {
  if (!match) return null
  return match.variant === 'enhanced'
    ? `${match.name_ru} · усиленный`
    : match.name_ru
}
