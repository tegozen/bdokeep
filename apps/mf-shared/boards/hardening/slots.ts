/** Hardening board: 5 active stones — same set for all Wan weapons. */

import {
  HARDENING_SLOT_IDS as DOMAIN_HARDENING_SLOT_IDS,
  MAX_HARDENING,
  MAX_HARDENING_ALL_PRESETS,
  isHardeningSlotId,
} from '@bdokeep/domain'

export const HARDENING_SLOT_IDS = DOMAIN_HARDENING_SLOT_IDS
export type HardeningSlotId = (typeof HARDENING_SLOT_IDS)[number]

export { MAX_HARDENING, MAX_HARDENING_ALL_PRESETS, isHardeningSlotId }

export type HardeningSlotDef = {
  id: HardeningSlotId
  label: string
}

export const HARDENING_SLOTS: ReadonlyArray<HardeningSlotDef> = HARDENING_SLOT_IDS.map(
  (id, i) => ({
    id,
    label: `Слот ${i + 1}`,
  }),
)
