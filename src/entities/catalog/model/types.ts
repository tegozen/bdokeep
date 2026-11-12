export type SkillAddonEffect = {
  id: string
  key: string
  name_ru: string
  effect_group: string
  tier_labels: Record<string, string> | null
  sort_order?: number
}

export type Buff = {
  id: string
  codex_id?: string | null
  name_ru: string
  icon_url: string | null
  description: string | null
}

export type Item = {
  id: string
  codex_id?: string | null
  name_ru: string
  icon_url: string | null
  item_type: string
  raw?: {
    group?: string | null
    rarity?: number | null
    sorting?: number | null
    source?: string | null
  } | null
}

export type LightstoneSetStone = {
  id: string
  codex_id: string
  name_ru: string
  icon_url: string | null
}

export type LightstoneSet = {
  id: string
  name_ru: string
  name_en: string | null
  category: 'combat' | 'lifeskill'
  bonuses: Array<{ key: string; label: string; value: number }>
  normal: LightstoneSetStone[]
  enhanced: LightstoneSetStone[]
}
