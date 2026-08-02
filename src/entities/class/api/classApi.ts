import type {
  BdoClass,
  Buff,
  ClassGuideBundle,
  Item,
  LightstoneSet,
  Skill,
} from '../model/types'

export async function fetchPublishedClasses(): Promise<BdoClass[]> {
  return $fetch<BdoClass[]>('/api/classes')
}

export async function updateClassTier(
  slug: string,
  tier: number | null,
  mode: 'awakening' | 'succession',
): Promise<{
  ok: boolean
  slug: string
  mode: 'awakening' | 'succession'
  tier: number | null
  tier_awakening: number | null
  tier_succession: number | null
}> {
  return $fetch(`/api/admin/classes/${encodeURIComponent(slug)}/tier`, {
    method: 'PATCH',
    body: { tier, mode },
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
