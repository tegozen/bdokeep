export type SectionUpdateMeta = {
  updated_at: string
  updated_by: string | null
}

export type SectionUpdatesMap = Record<string, SectionUpdateMeta>

/** UI section keys used in GuideSection subtitles. */
export type GuideUiSection =
  | 'summary'
  | 'combo'
  | 'morphs'
  | 'crystals'
  | 'relics'
  | 'buffs'
  | 'videos'

/** Map proposal section → UI section meta key. */
export function uiSectionFromProposal(section: string): GuideUiSection | null {
  switch (section) {
    case 'summary':
      return 'summary'
    case 'combo_awakening':
    case 'combo_succession':
      return 'combo'
    case 'morphs':
      return 'morphs'
    case 'crystals':
      return 'crystals'
    case 'relics':
      return 'relics'
    case 'buffs':
      return 'buffs'
    case 'videos':
      return 'videos'
    default:
      return null
  }
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
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  const by = displayAuthorLabel(meta.updated_by) || dash
  return `Обновлено ${date} · ${by}`
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
