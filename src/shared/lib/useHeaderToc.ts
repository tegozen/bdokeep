export type HeaderTocItem = {
  id: string
  label: string
}

export const CLASS_GUIDE_TOC: HeaderTocItem[] = [
  { id: 'buffs', label: 'Забаф' },
  { id: 'combo', label: 'Комба' },
  { id: 'crystals', label: 'Инкрустация' },
  { id: 'relics', label: 'Релики' },
  { id: 'lightstones', label: 'Камни' },
  { id: 'videos', label: 'Видео' },
]

export function useHeaderToc() {
  return useState<HeaderTocItem[] | null>('headerToc', () => null)
}
