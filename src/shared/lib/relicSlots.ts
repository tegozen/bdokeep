/** Relic board: 2 relics × 2 lightstones — mirrors BDO relic UI. */

import {
  LIGHTSTONE_SLOT_IDS as DOMAIN_LIGHTSTONE_SLOT_IDS,
  RELIC_SLOT_IDS as DOMAIN_RELIC_SLOT_IDS,
  isLightstoneSlotId,
  isRelicSlotId,
} from '@domain'

export const RELIC_SLOT_IDS = DOMAIN_RELIC_SLOT_IDS
export type RelicSlotId = (typeof RELIC_SLOT_IDS)[number]

export const LIGHTSTONE_SLOT_IDS = DOMAIN_LIGHTSTONE_SLOT_IDS
export type LightstoneSlotId = (typeof LIGHTSTONE_SLOT_IDS)[number]

export { isRelicSlotId, isLightstoneSlotId }

export function lightstoneSlotsForRelic(relic: RelicSlotId): LightstoneSlotId[] {
  return relic === 'r0' ? ['r0_a', 'r0_b'] : ['r1_a', 'r1_b']
}

export function relicSlotForLightstone(slot: LightstoneSlotId): RelicSlotId {
  return slot.startsWith('r0') ? 'r0' : 'r1'
}

export type RelicBoardSlotKind = 'relic' | 'lightstone'

export type RelicBoardSlotDef = {
  id: RelicSlotId | LightstoneSlotId
  kind: RelicBoardSlotKind
  relicIndex: 0 | 1
  label: string
}

export const RELIC_BOARD_PANELS: ReadonlyArray<{
  relic: RelicSlotId
  lights: LightstoneSlotId[]
  label: string
}> = [
  { relic: 'r0', lights: ['r0_a', 'r0_b'], label: 'Реликвия 1' },
  { relic: 'r1', lights: ['r1_a', 'r1_b'], label: 'Реликвия 2' },
]
