/** Shared board fill shapes (shell + remotes). Keep in sync with *Board.vue props. */
export type CrystalFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

export type RelicFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

export type HardeningFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

export type MorphSlotFill = {
  skill?: {
    id: string
    name_ru: string
    icon_url: string | null
    addon_tier?: number | null
  } | null
  effect1Label?: string | null
  effect2Label?: string | null
}
