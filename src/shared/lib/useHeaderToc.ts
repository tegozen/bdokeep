export type HeaderTocItem = {
  id: string
  label: string
}

export const CLASS_GUIDE_TOC: HeaderTocItem[] = [
  { id: 'summary', label: 'Суть' },
  { id: 'buffs', label: 'Забаф' },
  { id: 'skills', label: 'Скиллы' },
  { id: 'combo', label: 'Комба' },
  { id: 'essence', label: 'Инкра' },
  { id: 'relics', label: 'Релики' },
  { id: 'lightstones', label: 'Камни' },
  { id: 'crystals', label: 'Ваны' },
  { id: 'videos', label: 'Видео' },
]

export function useHeaderToc() {
  return useState<HeaderTocItem[] | null>('headerToc', () => null)
}
