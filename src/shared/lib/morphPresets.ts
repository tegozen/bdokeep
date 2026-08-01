export type MorphPresetId = 'aw_cut' | 'aw_besp' | 'succ_cut' | 'succ_besp'
export type MorphCutKind = 'cut' | 'besp'

export const MORPH_CUT_KINDS: ReadonlyArray<{ id: MorphCutKind; label: string }> = [
  { id: 'cut', label: 'Порезки' },
  { id: 'besp', label: 'Беспорезки' },
]

export const MORPH_PRESETS: ReadonlyArray<{ id: MorphPresetId; label: string }> = [
  { id: 'aw_cut', label: 'Порезки — проб' },
  { id: 'aw_besp', label: 'Беспорезки — проб' },
  { id: 'succ_cut', label: 'Порезки — насл' },
  { id: 'succ_besp', label: 'Беспорезки — насл' },
]

export const MORPH_PRESET_IDS: MorphPresetId[] = MORPH_PRESETS.map((p) => p.id)

export const MORPH_SLOT_LEVELS = [50, 52, 54, 56, 58, 60] as const
export type MorphSlotLevel = (typeof MORPH_SLOT_LEVELS)[number]

export const MAX_MORPHS_ALL_PRESETS = MORPH_SLOT_LEVELS.length * MORPH_PRESET_IDS.length

export function isMorphPresetId(v: string): v is MorphPresetId {
  return (MORPH_PRESET_IDS as string[]).includes(v)
}

export function isMorphSlotLevel(v: number): v is MorphSlotLevel {
  return (MORPH_SLOT_LEVELS as readonly number[]).includes(v)
}

export function isMorphCutKind(v: string): v is MorphCutKind {
  return v === 'cut' || v === 'besp'
}

export function morphCutKind(preset: MorphPresetId): MorphCutKind {
  return preset.endsWith('_besp') ? 'besp' : 'cut'
}

export function morphPresetFrom(
  mode: 'awakening' | 'succession',
  kind: MorphCutKind,
): MorphPresetId {
  const prefix = mode === 'succession' ? 'succ' : 'aw'
  return `${prefix}_${kind}`
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
