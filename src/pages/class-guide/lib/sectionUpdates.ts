import { uiSectionFromProposal as mapProposalSection, comboSectionUpdateKey } from '@domain'
import type { SectionUpdateMeta } from '@/entities/class'
import { formatRuDate } from '@/shared/lib/dates'

export type { SectionUpdateMeta }

export type SectionUpdatesMap = Record<string, SectionUpdateMeta>

/** UI section keys used in GuideSection subtitles. */
export type GuideUiSection =
  | 'summary'
  | 'combo'
  | 'morphs'
  | 'crystals'
  | 'relics'
  | 'hardening'
  | 'buffs'
  | 'videos'

/** Map proposal section → UI section meta key (for shared sections). */
export function uiSectionFromProposal(section: string): string | null {
  return mapProposalSection(section)
}

/** Resolve section_updates key for a guide UI block given active spec mode (+ kind for notes). */
export function sectionUpdateKey(
  base: GuideUiSection,
  mode: 'awakening' | 'succession' = 'awakening',
  kind: 'pvp' | 'pve' = 'pvp',
): string {
  if (base === 'summary') return `summary_${kind}_${mode}`
  if (base === 'videos') return `videos_${mode}`
  if (base === 'combo') return comboSectionUpdateKey(kind, mode)
  return base
}

/** Lookup section_updates with legacy fallback (pre-scoped combo used key "combo"). */
export function sectionUpdateMeta(
  updates: SectionUpdatesMap,
  base: GuideUiSection,
  mode: 'awakening' | 'succession' = 'awakening',
  kind: 'pvp' | 'pve' = 'pvp',
): SectionUpdateMeta | undefined {
  const key = sectionUpdateKey(base, mode, kind)
  const meta = updates[key]
  if (meta) return meta
  if (base === 'combo') return updates.combo
  return undefined
}

export function displayAuthorLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim()
  if (t === 'superadmin' || t.toLowerCase() === 'admin') return 'админ'
  return t
}

export function formatSectionUpdated(
  meta: SectionUpdateMeta | null | undefined,
): string {
  const dash = '—'
  if (!meta?.updated_at) return `Обновлено ${dash} · ${dash}`
  const d = new Date(meta.updated_at)
  if (Number.isNaN(d.getTime())) return `Обновлено ${dash} · ${dash}`
  const by = displayAuthorLabel(meta.updated_by) || dash
  return `Обновлено ${formatRuDate(meta.updated_at)} · ${by}`
}


export function parseSectionUpdates(raw: unknown): SectionUpdatesMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: SectionUpdatesMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    const updatedAt = row.updated_at
    if (typeof updatedAt !== 'string' && !(updatedAt instanceof Date)) continue
    out[key] = {
      updated_at: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
      updated_by:
        row.updated_by == null || row.updated_by === ''
          ? null
          : String(row.updated_by),
    }
  }
  return out
}
