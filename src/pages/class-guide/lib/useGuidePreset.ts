import type { CrystalPresetId } from '@/entities/catalog'

export function useGuidePreset() {
  return useState<CrystalPresetId>('guidePreset', () => 't1')
}
