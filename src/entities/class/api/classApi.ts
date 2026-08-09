import type { BdoClass, ClassGuideBundle, Skill } from '../model/types'
import type { ComboKindId, GuideSpecMode } from '@domain'

export async function fetchPublishedClasses(): Promise<BdoClass[]> {
  return $fetch<BdoClass[]>('/api/classes')
}

export async function updateClassTier(
  slug: string,
  tier: number | null,
  mode: GuideSpecMode,
  kind: ComboKindId = 'pvp',
): Promise<{
  ok: boolean
  slug: string
  mode: GuideSpecMode
  kind: ComboKindId
  tier: number | null
  tier_pvp_awakening: number | null
  tier_pvp_succession: number | null
  tier_pve_awakening: number | null
  tier_pve_succession: number | null
}> {
  return $fetch(`/api/admin/classes/${encodeURIComponent(slug)}/tier`, {
    method: 'PATCH',
    body: { tier, mode, kind },
  })
}

export async function fetchClassSkills(classSlug: string): Promise<Skill[]> {
  return $fetch<Skill[]>(`/api/classes/${encodeURIComponent(classSlug)}/skills`)
}

export async function fetchClassGuideBySlug(slug: string): Promise<ClassGuideBundle | null> {
  try {
    return await $fetch<ClassGuideBundle>(`/api/classes/${encodeURIComponent(slug)}/guide`)
  } catch (err: unknown) {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { statusCode?: number; status?: number })?.status
    if (status === 404) return null
    throw err
  }
}
