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
  /** Guide has any filled content (summary / sections / videos) */
  has_content?: boolean
}

export type ClassGuide = {
  id: string
  class_id: string
  summary: string | null
  updated_at: string
}

export type ClassVideo = {
  id: string
  class_id: string
  title: string
  youtube_url: string
  sort_order: number
}

export type Skill = {
  id: string
  name_ru: string
  icon_url: string | null
  class_slug: string | null
  skill_type?: string | null
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
}

export type GuideComboStepRow = {
  id: string
  mode: 'awakening' | 'succession' | string
  sort_order: number
  notes: string | null
  skills: Skill | null
}

export type GuideBuffRow = {
  id: string
  slot: string | null
  group_name: string | null
  notes: string | null
  sort_order: number
  buffs: Buff | null
}

export type GuideItemRow = {
  id: string
  slot: string | null
  /** Crystal preset: t1 / t2 / besp / sub (only on guide_crystals). */
  preset?: string | null
  notes: string | null
  sort_order: number
  items: Item | null
}

export type ClassGuideBundle = {
  class: BdoClass
  guide: ClassGuide | null
  videos: ClassVideo[]
  comboSteps: GuideComboStepRow[]
  buffs: GuideBuffRow[]
  relics: GuideItemRow[]
  lightstones: GuideItemRow[]
  crystals: GuideItemRow[]
  essence: GuideItemRow[]
}

export type ProposalSection =
  | 'summary'
  | 'buffs'
  | 'combo_awakening'
  | 'combo_succession'
  | 'crystals'
