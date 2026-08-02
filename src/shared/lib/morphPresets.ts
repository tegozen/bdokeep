import {
  MAX_MORPHS_ALL_PRESETS,
  MORPH_PRESET_IDS as DOMAIN_MORPH_PRESET_IDS,
  MORPH_SLOT_LEVELS as DOMAIN_MORPH_SLOT_LEVELS,
  isMorphPresetId,
  isMorphSlotLevel,
  type MorphPresetId,
} from '@domain'
import { CRYSTAL_PRESET_IDS, type CrystalPresetId } from './crystalPresets'

export type MorphSpecPrefix = 'aw' | 'succ'
export type { MorphPresetId }
export type MorphSlotLevel = (typeof DOMAIN_MORPH_SLOT_LEVELS)[number]

export const MORPH_PRESETS: ReadonlyArray<{ id: MorphPresetId; label: string }> = [
  { id: 'aw_t1', label: 'T1 — проб' },
  { id: 'aw_t2', label: 'T2 — проб' },
  { id: 'aw_besp', label: 'Беспорезки — проб' },
  { id: 'aw_sub', label: 'Субботка — проб' },
  { id: 'succ_t1', label: 'T1 — насл' },
  { id: 'succ_t2', label: 'T2 — насл' },
  { id: 'succ_besp', label: 'Беспорезки — насл' },
  { id: 'succ_sub', label: 'Субботка — насл' },
]

export const MORPH_PRESET_IDS: MorphPresetId[] = [...DOMAIN_MORPH_PRESET_IDS]
export const MORPH_SLOT_LEVELS = DOMAIN_MORPH_SLOT_LEVELS
export { MAX_MORPHS_ALL_PRESETS, isMorphPresetId, isMorphSlotLevel }

export function morphGuidePreset(preset: MorphPresetId): CrystalPresetId {
  return preset.slice(preset.indexOf('_') + 1) as CrystalPresetId
}

export function morphPresetFrom(
  mode: 'awakening' | 'succession',
  kind: CrystalPresetId,
): MorphPresetId {
  const prefix: MorphSpecPrefix = mode === 'succession' ? 'succ' : 'aw'
  return `${prefix}_${kind}`
}

export function emptyMorphPresetBoards<T>(): Record<MorphPresetId, T> {
  const out = {} as Record<MorphPresetId, T>
  for (const id of MORPH_PRESET_IDS) {
    out[id] = {} as T
  }
  return out
}

/** Awakening kit vs main+succession kit for a morph preset. */
export function morphPresetSkillMode(preset: MorphPresetId): 'awakening' | 'main' {
  return preset.startsWith('succ_') ? 'main' : 'awakening'
}

export function resolveAddonLabel(
  tierLabels: Record<string, string> | null | undefined,
  tier: number | null | undefined,
  fallback: string,
): string {
  const t = tier === 1 || tier === 2 || tier === 3 ? String(tier) : '2'
  return tierLabels?.[t] || tierLabels?.['2'] || fallback
}

/** Board slot ids — same interaction model as relic / lightstone. */
export type MorphEffectIndex = 'a' | 'b'

export function morphSkillSlotId(level: MorphSlotLevel): string {
  return String(level)
}

export function morphEffectSlotId(level: MorphSlotLevel, index: MorphEffectIndex): string {
  return `${level}_${index}`
}

export function parseMorphBoardSlot(
  id: string,
): { level: MorphSlotLevel; kind: 'skill' | 'effect'; effectIndex?: MorphEffectIndex } | null {
  const effect = id.match(/^(\d+)_(a|b)$/)
  if (effect) {
    const level = Number(effect[1])
    if (!isMorphSlotLevel(level)) return null
    return { level, kind: 'effect', effectIndex: effect[2] as MorphEffectIndex }
  }
  const level = Number(id)
  if (!isMorphSlotLevel(level)) return null
  return { level, kind: 'skill' }
}

/** Re-export for callers that only touch morph presets. */
export { CRYSTAL_PRESET_IDS as MORPH_GUIDE_PRESET_IDS }
