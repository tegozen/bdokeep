/** Shared proposal domain (Nuxt + Nitro). Keep IDs/limits in sync here only. */

export const PROPOSAL_SECTIONS = [
  'summary_awakening',
  'summary_succession',
  'buffs',
  'combo_awakening',
  'combo_succession',
  'crystals',
  'relics',
  'hardening',
  'videos_awakening',
  'videos_succession',
  'morphs',
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
export const MAX_HARDENING = 5
export const MAX_HARDENING_ALL_PRESETS = 5 * 4
export const MAX_VIDEOS = 3
export const MAX_MORPHS_ALL_PRESETS = 6 * 8
export const MAX_AUTHOR_LEN = 80

export const CRYSTAL_PRESET_IDS = ['t1', 't2', 'besp', 'sub'] as const
export type CrystalPresetId = (typeof CRYSTAL_PRESET_IDS)[number]

export const MORPH_PRESET_IDS = [
  'aw_t1',
  'aw_t2',
  'aw_besp',
  'aw_sub',
  'succ_t1',
  'succ_t2',
  'succ_besp',
  'succ_sub',
] as const
export type MorphPresetId = (typeof MORPH_PRESET_IDS)[number]

export const MORPH_SLOT_LEVELS = [50, 52, 54, 56, 58, 60] as const

export const RELIC_SLOT_IDS = ['r0', 'r1'] as const
export const LIGHTSTONE_SLOT_IDS = ['r0_a', 'r0_b', 'r1_a', 'r1_b'] as const
export const HARDENING_SLOT_IDS = ['h0', 'h1', 'h2', 'h3', 'h4'] as const

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

export function isHardeningSection(section: ProposalSection): boolean {
  return section === 'hardening'
}

export function isSummarySection(section: ProposalSection): boolean {
  return section === 'summary_awakening' || section === 'summary_succession'
}

export function isVideosSection(section: ProposalSection): boolean {
  return section === 'videos_awakening' || section === 'videos_succession'
}

export function isMorphsSection(section: ProposalSection): boolean {
  return section === 'morphs'
}

export function comboModeFromSection(section: ProposalSection): 'awakening' | 'succession' {
  return section === 'combo_succession' ? 'succession' : 'awakening'
}

export function summaryModeFromSection(section: ProposalSection): 'awakening' | 'succession' {
  return section === 'summary_succession' ? 'succession' : 'awakening'
}

export function videoModeFromSection(section: ProposalSection): 'awakening' | 'succession' {
  return section === 'videos_succession' ? 'succession' : 'awakening'
}

export function isCrystalSlotId(id: string): boolean {
  return (CRYSTAL_SLOT_IDS as readonly string[]).includes(id)
}

export function isCrystalPresetId(id: string): id is CrystalPresetId {
  return (CRYSTAL_PRESET_IDS as readonly string[]).includes(id)
}

export function isMorphPresetId(id: string): id is MorphPresetId {
  return (MORPH_PRESET_IDS as readonly string[]).includes(id)
}

/**
 * Presets this proposal replaces on approve (merge: other live presets stay).
 * Prefer explicit `replaced_presets`; else derive from row presets (legacy payloads).
 */
export function resolveReplacedPresets(
  raw: unknown,
  fromRows: readonly string[],
  isValid: (id: string) => boolean,
): string[] {
  if (Array.isArray(raw)) {
    const ids = [
      ...new Set(raw.map((x) => String(x)).filter((id) => isValid(id))),
    ]
    if (ids.length) return ids
  }
  return [...new Set(fromRows.filter((id) => isValid(id)))]
}

export function rowsWithinReplaced(
  replaced: readonly string[],
  rowPresets: readonly string[],
): boolean {
  const set = new Set(replaced)
  return rowPresets.every((p) => set.has(p))
}

export type FinalizeReplacedResult =
  | { ok: true; replaced: string[] }
  | { ok: false; reason: 'empty' | 'rows_outside_replaced' }

/**
 * Resolve + enforce rows ⊆ replaced. After catalog drops, drop presets that had
 * structural rows but no kept rows (avoid wiping live data for vanished catalog ids).
 * Intentional empties (in replaced, never in structural rows) stay.
 */
export function finalizeReplacedPresets(
  raw: unknown,
  structuralRowPresets: readonly string[],
  keptRowPresets: readonly string[],
  isValid: (id: string) => boolean,
): FinalizeReplacedResult {
  const replaced = resolveReplacedPresets(raw, keptRowPresets, isValid)
  if (!replaced.length) return { ok: false, reason: 'empty' }

  const replacedSet = new Set(replaced)
  const structural = [...new Set(structuralRowPresets.filter((id) => isValid(id)))]
  const kept = [...new Set(keptRowPresets.filter((id) => isValid(id)))]

  if (structural.some((p) => !replacedSet.has(p)) || kept.some((p) => !replacedSet.has(p))) {
    return { ok: false, reason: 'rows_outside_replaced' }
  }

  const structuralSet = new Set(structural)
  const keptSet = new Set(kept)
  const narrowed = replaced.filter((id) => keptSet.has(id) || !structuralSet.has(id))
  if (!narrowed.length) return { ok: false, reason: 'empty' }
  return { ok: true, replaced: narrowed }
}

export function isMorphSlotLevel(v: number): boolean {
  return (MORPH_SLOT_LEVELS as readonly number[]).includes(v)
}

export function isRelicSlotId(id: string): boolean {
  return (RELIC_SLOT_IDS as readonly string[]).includes(id)
}

export function isLightstoneSlotId(id: string): boolean {
  return (LIGHTSTONE_SLOT_IDS as readonly string[]).includes(id)
}

export function isHardeningSlotId(id: string): boolean {
  return (HARDENING_SLOT_IDS as readonly string[]).includes(id)
}

/** Proposal section → section_updates / UI meta key. */
export function uiSectionFromProposal(section: string): string | null {
  switch (section) {
    case 'summary_awakening':
    case 'summary_succession':
    case 'videos_awakening':
    case 'videos_succession':
      return section
    case 'combo_awakening':
    case 'combo_succession':
      return 'combo'
    case 'morphs':
    case 'crystals':
    case 'relics':
    case 'hardening':
    case 'buffs':
      return section
    default:
      return null
  }
}

export function sectionLabel(section: string): string {
  switch (section) {
    case 'summary_awakening':
      return 'Роль на осаде (пробуждение)'
    case 'summary_succession':
      return 'Роль на осаде (наследие)'
    case 'buffs':
      return 'Забаф'
    case 'combo_awakening':
      return 'Комба (пробуждение)'
    case 'combo_succession':
      return 'Комба (наследие)'
    case 'crystals':
      return 'Инкрустация'
    case 'relics':
      return 'Реликвии'
    case 'hardening':
      return 'Закалки'
    case 'videos_awakening':
      return 'Видео (пробуждение)'
    case 'videos_succession':
      return 'Видео (наследие)'
    case 'morphs':
      return 'Морфы'
    default:
      return section
  }
}
