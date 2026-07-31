/** Relic board: 2 relics × 2 lightstones — mirrors BDO relic UI. */

export const RELIC_SLOT_IDS = ['r0', 'r1'] as const
export type RelicSlotId = (typeof RELIC_SLOT_IDS)[number]

export const LIGHTSTONE_SLOT_IDS = ['r0_a', 'r0_b', 'r1_a', 'r1_b'] as const
export type LightstoneSlotId = (typeof LIGHTSTONE_SLOT_IDS)[number]

export function isRelicSlotId(id: string): id is RelicSlotId {
  return (RELIC_SLOT_IDS as readonly string[]).includes(id)
}

export function isLightstoneSlotId(id: string): id is LightstoneSlotId {
  return (LIGHTSTONE_SLOT_IDS as readonly string[]).includes(id)
}

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
