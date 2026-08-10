/** Collapse ranked skill name variants (roman prefix/suffix) for combo catalog. */

/** Longest-first so XI/XX/XXX beat X, VIII beats V, etc. Seed goes up to ~XXX. */
const ROMAN =
  'XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|' +
  'XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|' +
  'IX|VIII|VII|VI|V|IV|III|II|I'

const PREFIX_RE = new RegExp(`^(${ROMAN}):\\s*(.+)$`, 'i')
/** `Зарево I (Черный дух)` → base `Зарево (Черный дух)` */
const BEFORE_PAREN_RE = new RegExp(`^(.+?)\\s+(${ROMAN})\\s+(\\([^)]+\\))$`, 'i')
const SUFFIX_RE = new RegExp(`^(.+?)\\s+(${ROMAN})$`, 'i')

function romanToInt(raw: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 }
  const s = raw.toUpperCase()
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]!] ?? 0
    const next = map[s[i + 1]!] ?? 0
    n += cur < next ? -cur : cur
  }
  return n
}

export type SkillRankParse = {
  base: string
  rank: number
}

export function parseSkillRank(name: string): SkillRankParse {
  const trimmed = name.trim()
  const prefix = trimmed.match(PREFIX_RE)
  if (prefix) {
    return {
      base: prefix[2]!.trim(),
      rank: romanToInt(prefix[1]!),
    }
  }
  const beforeParen = trimmed.match(BEFORE_PAREN_RE)
  if (beforeParen) {
    return {
      base: `${beforeParen[1]!.trim()} ${beforeParen[3]!.trim()}`,
      rank: romanToInt(beforeParen[2]!),
    }
  }
  const suffix = trimmed.match(SUFFIX_RE)
  if (suffix) {
    return {
      base: suffix[1]!.trim(),
      rank: romanToInt(suffix[2]!),
    }
  }
  return { base: trimmed, rank: 0 }
}

export type RankCollapsibleSkill = {
  id: string
  name_ru: string
  icon_url?: string | null
}

/**
 * One row per base name; keeps the highest roman rank.
 * Display `name_ru` is the base (no roman). Order = first appearance of each base.
 */
export function collapseSkillsByRank<T extends RankCollapsibleSkill>(skills: readonly T[]): T[] {
  const order: string[] = []
  const best = new Map<string, { skill: T; rank: number; base: string }>()

  for (const skill of skills) {
    const { base, rank } = parseSkillRank(skill.name_ru)
    const key = base.toLowerCase()
    const prev = best.get(key)
    if (!prev) {
      order.push(key)
      best.set(key, { skill, rank, base })
      continue
    }
    if (rank > prev.rank) {
      best.set(key, { skill, rank, base })
    }
  }

  return order.map((key) => {
    const entry = best.get(key)!
    return { ...entry.skill, name_ru: entry.base }
  })
}
