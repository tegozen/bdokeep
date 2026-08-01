export type HeaderTocItem = {
  id: string
  label: string
}

export const CLASS_GUIDE_TOC: HeaderTocItem[] = [
  { id: 'combo', label: 'Комба' },
  { id: 'morphs', label: 'Морфы' },
  { id: 'crystals', label: 'Инкрустация' },
  { id: 'relics', label: 'Реликвии' },
  { id: 'buffs', label: 'Забаф' },
  { id: 'videos', label: 'Видео' },
]

export function useHeaderToc() {
  return useState<HeaderTocItem[] | null>('headerToc', () => null)
}
