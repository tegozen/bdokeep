/**
 * svc-proposals orchestrator notes + section apply dispatch map.
 * Host still runs full applyProposal during strangler; this module documents
 * which domain service owns each proposal section for cutover.
 */
import type { ProposalSection } from '@bdokeep/domain'

export const SECTION_SERVICE: Record<string, string> = {
  crystals: 'svc-crystals',
  relics: 'svc-relics',
  hardening: 'svc-hardening',
  morphs: 'svc-morphs',
  combo_awakening: 'svc-combo',
  combo_succession: 'svc-combo',
  buffs: 'svc-buffs',
  videos_awakening: 'svc-videos',
  videos_succession: 'svc-videos',
  summary_awakening: 'svc-classes',
  summary_succession: 'svc-classes',
}

export function serviceForSection(section: ProposalSection | string): string | null {
  return SECTION_SERVICE[section] ?? null
}

/** Internal apply URL for a section domain (Docker DNS). */
export function internalApplyUrl(section: ProposalSection | string): string | null {
  const svc = serviceForSection(section)
  if (!svc) return null
  const portBySvc: Record<string, number> = {
    'svc-crystals': 3020,
    'svc-relics': 3021,
    'svc-hardening': 3022,
    'svc-morphs': 3023,
    'svc-combo': 3024,
    'svc-buffs': 3025,
    'svc-videos': 3026,
    'svc-classes': 3013,
  }
  const port = portBySvc[svc]
  if (!port) return null
  return `http://${svc}:${port}/internal/apply`
}
