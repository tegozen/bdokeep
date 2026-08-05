import {
  CRYSTAL_PRESET_IDS as DOMAIN_PRESET_IDS,
  MAX_CRYSTALS_ALL_PRESETS,
  isCrystalPresetId,
  type CrystalPresetId,
} from '@bdokeep/domain'

export type { CrystalPresetId }
export { isCrystalPresetId, MAX_CRYSTALS_ALL_PRESETS }

export const CRYSTAL_PRESETS: ReadonlyArray<{ id: CrystalPresetId; label: string }> = [
  { id: 't1', label: 'T1' },
  { id: 't2', label: 'T2' },
  { id: 'besp', label: 'Беспорезки' },
  { id: 'sub', label: 'Субботка' },
]

export const CRYSTAL_PRESET_IDS: CrystalPresetId[] = [...DOMAIN_PRESET_IDS]
