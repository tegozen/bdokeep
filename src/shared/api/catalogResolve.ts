export type CatalogResolveResult = {
  skills: Array<{
    id: string
    name_ru: string
    icon_url: string | null
    class_slug: string | null
    skill_type?: string | null
    supports_addon?: boolean | null
    addon_tier?: number | null
  }>
  buffs: Array<{
    id: string
    name_ru: string
    icon_url: string | null
    description: string | null
  }>
  items: Array<{
    id: string
    name_ru: string
    icon_url: string | null
    item_type: string
  }>
  skill_addon_effects: Array<{
    id: string
    key: string
    name_ru: string
    effect_group: string
    tier_labels: Record<string, string> | null
    sort_order?: number
  }>
}

export async function resolveCatalogIds(body: {
  skills?: string[]
  buffs?: string[]
  items?: string[]
  skill_addon_effects?: string[]
}): Promise<CatalogResolveResult> {
  return $fetch<CatalogResolveResult>('/api/catalog/resolve', {
    method: 'POST',
    body,
  })
}
