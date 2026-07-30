export const PROPOSAL_SECTIONS = [
  'summary',
  'combo_awakening',
  'combo_succession',
] as const

export type ProposalSection = (typeof PROPOSAL_SECTIONS)[number]

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const MAX_TEXT_LEN = 8000
export const MAX_COMBO_STEPS = 30
export const MAX_AUTHOR_LEN = 80

export function isComboSection(section: ProposalSection): boolean {
  return section === 'combo_awakening' || section === 'combo_succession'
}

export function comboModeFromSection(section: ProposalSection): 'awakening' | 'succession' {
  return section === 'combo_succession' ? 'succession' : 'awakening'
}
