/** Guide preset tabs (T1/T2/besp/sub) — shared across section domains. */
import {
  CRYSTAL_PRESET_IDS as DOMAIN_PRESET_IDS,
  isCrystalPresetId,
  type CrystalPresetId,
} from '@bdokeep/domain'

export type { CrystalPresetId }
export { isCrystalPresetId }

export const GUIDE_PRESETS: ReadonlyArray<{ id: CrystalPresetId; label: string }> = [
  { id: 't1', label: 'T1' },
  { id: 't2', label: 'T2' },
  { id: 'besp', label: 'Беспорезки' },
  { id: 'sub', label: 'Субботка' },
]

export const GUIDE_PRESET_IDS: CrystalPresetId[] = [...DOMAIN_PRESET_IDS]
