import type { CrystalPresetId } from './crystalPresets'

export function useGuidePreset() {
  return useState<CrystalPresetId>('guidePreset', () => 't1')
}
