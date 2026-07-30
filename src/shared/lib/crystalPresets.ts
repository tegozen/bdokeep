export type CrystalPresetId = 't1' | 't2' | 'besp' | 'sub'

export const CRYSTAL_PRESETS: ReadonlyArray<{ id: CrystalPresetId; label: string }> = [
  { id: 't1', label: 'T1' },
  { id: 't2', label: 'T2' },
  { id: 'besp', label: 'Беспорезки' },
  { id: 'sub', label: 'Субботка' },
]

export const CRYSTAL_PRESET_IDS: CrystalPresetId[] = CRYSTAL_PRESETS.map((p) => p.id)

export function isCrystalPresetId(id: string): id is CrystalPresetId {
  return (CRYSTAL_PRESET_IDS as string[]).includes(id)
}

/** Max crystal rows across all presets (17 board + 6 dawn) × 3. */
export const MAX_CRYSTALS_ALL_PRESETS = 23 * CRYSTAL_PRESET_IDS.length
