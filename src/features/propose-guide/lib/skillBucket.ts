import type { Skill } from '@/entities/class'

/** Catalog group for combo skill picker */
export type SkillCatalogBucket = 'main' | 'awakening' | 'succession'

/** Heuristic from BDOCodex: type 1 ≈ base ranks; "Наследие:" = succession; rest of type 0 ≈ awakening. */
export function skillCatalogBucket(skill: Pick<Skill, 'name_ru' | 'skill_type'>): SkillCatalogBucket {
  const name = skill.name_ru.trim()
  if (/^наследие\s*:/i.test(name) || /^наследие\b/i.test(name)) return 'succession'
  if (skill.skill_type === '0') return 'awakening'
  return 'main'
}
