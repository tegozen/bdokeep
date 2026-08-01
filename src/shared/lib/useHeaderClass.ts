import type { BdoClass } from '@/entities/class'

export type HeaderClassInfo = Pick<
  BdoClass,
  'slug' | 'name_ru' | 'icon_url' | 'tier_awakening' | 'tier_succession'
>

export function useHeaderClass() {
  return useState<HeaderClassInfo | null>('headerClass', () => null)
}
