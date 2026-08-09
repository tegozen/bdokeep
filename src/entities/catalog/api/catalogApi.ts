import type { Buff, Item, LightstoneSet, SkillAddonEffect } from '../model/types'

export async function fetchSkillAddonEffects(): Promise<SkillAddonEffect[]> {
  return $fetch<SkillAddonEffect[]>('/api/catalog/skill-addon-effects')
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
