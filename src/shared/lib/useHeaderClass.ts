import type { BdoClass } from '@/entities/class'

export type HeaderClassInfo = Pick<BdoClass, 'slug' | 'name_ru' | 'icon_url' | 'tier'>

export function useHeaderClass() {
  return useState<HeaderClassInfo | null>('headerClass', () => null)
}
