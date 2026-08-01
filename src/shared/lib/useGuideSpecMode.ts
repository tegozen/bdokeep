export type GuideSpecMode = 'awakening' | 'succession'

export function useGuideSpecMode() {
  return useState<GuideSpecMode>('guideSpecMode', () => 'awakening')
}
