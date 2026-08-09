import type { MorphSlotLevel } from './morphPresets'

/** Slot fill for crystal / relic / hardening boards. */
export type BoardItemFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

export type CrystalFill = BoardItemFill
export type RelicFill = BoardItemFill
export type HardeningFill = BoardItemFill

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

export type MorphFilledMap = Partial<Record<MorphSlotLevel, MorphSlotFill>>
