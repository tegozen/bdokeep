import type {
  BdoClass,
  Buff,
  ClassGuideBundle,
  Item,
  LightstoneSet,
  Skill,
} from '../model/types'
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

export async function fetchSkillAddonEffects(): Promise<
  import('../model/types').SkillAddonEffect[]
> {
  return $fetch('/api/catalog/skill-addon-effects')
}

export async function fetchBuffs(): Promise<Buff[]> {
  return $fetch<Buff[]>('/api/catalog/buffs')
}

export async function fetchCrystals(): Promise<Item[]> {
  return $fetch<Item[]>('/api/catalog/crystals')
}

export async function fetchRelics(): Promise<Item[]> {
  return $fetch<Item[]>('/api/catalog/relics')
}

export async function fetchLightstones(): Promise<Item[]> {
  return $fetch<Item[]>('/api/catalog/lightstones')
}

export async function fetchLightstoneSets(): Promise<LightstoneSet[]> {
  return $fetch<LightstoneSet[]>('/api/catalog/lightstone-sets')
}

export async function fetchHardening(): Promise<Item[]> {
  return $fetch<Item[]>('/api/catalog/hardening')
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
