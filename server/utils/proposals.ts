export const PROPOSAL_SECTIONS = [
  'summary',
  'buffs',
  'combo_awakening',
  'combo_succession',
  'crystals',
  'relics',
  'videos',
] as const

export type ProposalSection = (typeof PROPOSAL_SECTIONS)[number]

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const MAX_TEXT_LEN = 8000
export const MAX_COMBO_STEPS = 30
export const MAX_BUFFS = 20
export const MAX_BUFFS_ALL_PRESETS = 20 * 4
export const MAX_CRYSTALS = 23
export const MAX_CRYSTALS_ALL_PRESETS = 23 * 4
export const MAX_RELICS_ALL_PRESETS = 2 * 4
export const MAX_LIGHTSTONES_ALL_PRESETS = 4 * 4
export const MAX_VIDEOS = 3
export const MAX_AUTHOR_LEN = 80

export const CRYSTAL_PRESET_IDS = ['t1', 't2', 'besp', 'sub'] as const
export type CrystalPresetId = (typeof CRYSTAL_PRESET_IDS)[number]

export const RELIC_SLOT_IDS = ['r0', 'r1'] as const
export const LIGHTSTONE_SLOT_IDS = ['r0_a', 'r0_b', 'r1_a', 'r1_b'] as const

export const CRYSTAL_SLOT_IDS = [
  'nw',
  'n',
  'ne',
  'n_w',
  'n_c',
  'n_e',
  'w',
  'c_w',
  'center',
  'c_e',
  'e',
  's_w',
  's_c',
  's_e',
  'sw',
  's',
  'se',
  'dawn_0',
  'dawn_1',
  'dawn_2',
  'dawn_3',
  'dawn_4',
  'dawn_5',
] as const

export function isComboSection(section: ProposalSection): boolean {
  return section === 'combo_awakening' || section === 'combo_succession'
}

export function isBuffsSection(section: ProposalSection): boolean {
  return section === 'buffs'
}

export function isCrystalsSection(section: ProposalSection): boolean {
  return section === 'crystals'
}

export function isRelicsSection(section: ProposalSection): boolean {
  return section === 'relics'
}

export function isVideosSection(section: ProposalSection): boolean {
  return section === 'videos'
}

export function comboModeFromSection(section: ProposalSection): 'awakening' | 'succession' {
  return section === 'combo_succession' ? 'succession' : 'awakening'
}

export function isCrystalSlotId(id: string): boolean {
  return (CRYSTAL_SLOT_IDS as readonly string[]).includes(id)
}

export function isCrystalPresetId(id: string): id is CrystalPresetId {
  return (CRYSTAL_PRESET_IDS as readonly string[]).includes(id)
}

export function isRelicSlotId(id: string): boolean {
  return (RELIC_SLOT_IDS as readonly string[]).includes(id)
}

export function isLightstoneSlotId(id: string): boolean {
  return (LIGHTSTONE_SLOT_IDS as readonly string[]).includes(id)
}
