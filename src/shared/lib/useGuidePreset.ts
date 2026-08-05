import type { CrystalPresetId } from './guidePresets'

export function useGuidePreset() {
  return useState<CrystalPresetId>('guidePreset', () => 't1')
}
