import type { Skill } from '@/entities/class'

/** Catalog group for combo / morph skill picker */
export type SkillCatalogBucket = 'main' | 'awakening'

/**
 * Heuristic from BDOCodex RU names / types:
 * - skill_type 0 ≈ awakening kit
 * - everything else (main ranks, Абсолют, Мощь / Наследие) = main weapon kit
 *
 * Succession («Мощь:» / «Наследие:») stays with main — same weapon tree.
 */
export function skillCatalogBucket(skill: Pick<Skill, 'name_ru' | 'skill_type'>): SkillCatalogBucket {
  if (skill.skill_type === '0') {
    const name = skill.name_ru.trim()
    // Succession ranks sometimes carry type 0 in Codex; keep them in main kit
    if (/^(мощь|наследие)\s*:/i.test(name)) return 'main'
    return 'awakening'
  }
  return 'main'
}
