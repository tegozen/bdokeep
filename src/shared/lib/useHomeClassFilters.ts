export type HomeTierMin = 0 | 3 | 4 | 5

export const HOME_TIER_OPTIONS: ReadonlyArray<{ min: HomeTierMin; label: string }> = [
  { min: 0, label: 'Все' },
  { min: 3, label: 'от 3★' },
  { min: 4, label: 'от 4★' },
  { min: 5, label: '5★' },
]

export function useHomeClassFilters() {
  const tierMin = useState<HomeTierMin>('homeTierMin', () => 0)
  const hideEmpty = useState<boolean>('homeHideEmpty', () => false)
  return { tierMin, hideEmpty, tierOptions: HOME_TIER_OPTIONS }
}
