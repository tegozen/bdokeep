import type { BdoClass } from '@/entities/class'

export type HeaderClassInfo = Pick<
  BdoClass,
  | 'slug'
  | 'name_ru'
  | 'icon_url'
  | 'tier_pvp_awakening'
  | 'tier_pvp_succession'
  | 'tier_pve_awakening'
  | 'tier_pve_succession'
>

export function useHeaderClass() {
  return useState<HeaderClassInfo | null>('headerClass', () => null)
}
