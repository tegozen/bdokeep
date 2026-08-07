export type BdoClass = {
  id: string
  slug: string
  name_ru: string
  icon_url: string | null
  portrait_url: string | null
  awakening_name: string | null
  succession_name: string | null
  sort_order: number
  published: boolean
  /** ПВП тир 1–5 для пробуждения (админ). Null = не оценён. */
  tier_pvp_awakening?: number | null
  /** ПВП тир 1–5 для наследия (админ). Null = не оценён. */
  tier_pvp_succession?: number | null
  /** ПВЕ тир 1–5 для пробуждения (админ). Null = не оценён. */
  tier_pve_awakening?: number | null
  /** ПВЕ тир 1–5 для наследия (админ). Null = не оценён. */
  tier_pve_succession?: number | null
  /** Guide has any filled content (summary / sections / videos) */
  has_content?: boolean
}

export type SectionUpdateMeta = {
  updated_at: string
  updated_by: string | null
}

export type ClassGuide = {
  id: string
  class_id: string
  summary_pvp_awakening: string | null
  summary_pvp_succession: string | null
  summary_pve_awakening: string | null
  summary_pve_succession: string | null
  updated_at: string
  /** Per UI-section last update keys (summary_pvp_awakening, combo, videos_succession, …) */
  section_updates?: Record<string, SectionUpdateMeta> | null
}

export type ClassVideo = {
  id: string
  class_id: string
  title: string
  youtube_url: string
  sort_order: number
  mode: 'awakening' | 'succession' | string
  /** Missing / ready → playable; processing → awaiting YouTube thumb. */
  status?: 'ready' | 'processing' | string | null
}

export type Skill = {
  id: string
  name_ru: string
  icon_url: string | null
  class_slug: string | null
  skill_type?: string | null
  supports_addon?: boolean | null
  addon_tier?: number | null
  /** Garmoth-allowed effect keys for this skill (empty = unknown / not morphable). */
  addon_effect_keys?: string[] | null
}

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
  name_ru: string
  icon_url: string | null
  description: string | null
}

export type Item = {
  id: string
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

export type GuideComboStepRow = {
  id: string
  sort_order: number
  skills: Skill | null
}

export type GuideCombo = {
  id: string
  mode: 'awakening' | 'succession' | string
  /** PvP (default) or PvE — shared across gear presets except `pve`. */
  kind?: 'pvp' | 'pve' | string
  sort_order: number
  title: string | null
  notes: string | null
  steps: GuideComboStepRow[]
}

export type GuideBuffRow = {
  id: string
  slot: string | null
  /** Preset: t1 / t2 / besp / sub / pve. */
  preset?: string | null
  group_name: string | null
  notes: string | null
  sort_order: number
  buffs: Buff | null
}

export type GuideItemRow = {
  id: string
  slot: string | null
  /** Preset: t1 / t2 / besp / sub / pve (crystals, relics, lightstones, hardening). */
  preset?: string | null
  notes: string | null
  sort_order: number
  items: Item | null
}

export type GuideMorphRow = {
  id: string
  preset: string
  slot_level: number
  sort_order: number
  skills: Skill | null
  effect1: SkillAddonEffect | null
  effect2: SkillAddonEffect | null
}

export type ClassGuideBundle = {
  class: BdoClass
  guide: ClassGuide | null
  videos: ClassVideo[]
  combos: GuideCombo[]
  buffs: GuideBuffRow[]
  relics: GuideItemRow[]
  lightstones: GuideItemRow[]
  crystals: GuideItemRow[]
  hardening: GuideItemRow[]
  morphs: GuideMorphRow[]
}

export type { ProposalSection } from '@domain'
