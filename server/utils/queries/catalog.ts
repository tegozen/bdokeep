import type postgres from 'postgres'
import { UUID_RE } from '../proposals'

type Sql = ReturnType<typeof postgres>

const MAX_RESOLVE_IDS = 200

export type CatalogResolveBody = {
  skills?: string[]
  buffs?: string[]
  items?: string[]
  skill_addon_effects?: string[]
}

function uniqUuids(ids: unknown, max = MAX_RESOLVE_IDS): string[] {
  if (!Array.isArray(ids)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    const id = String(raw || '')
    if (!UUID_RE.test(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

export async function listBuffs(sql: Sql) {
  return sql`
    select id, name_ru, icon_url, description
    from buffs
    order by name_ru asc
  `
}

export async function listItemsByType(sql: Sql, itemType: 'crystal' | 'relic' | 'lightstone') {
  return sql`
    select id, name_ru, icon_url, item_type
    from items
    where item_type = ${itemType}
    order by name_ru asc
  `
}

export async function listSkillAddonEffects(sql: Sql) {
  return sql`
    select id, key, name_ru, effect_group, tier_labels, sort_order
    from skill_addon_effects
    order by sort_order asc
  `
}

export async function listSkillsForClass(sql: Sql, classSlug: string) {
  return sql`
    select id, name_ru, icon_url, class_slug, skill_type, supports_addon, addon_tier
    from skills
    where class_slug = ${classSlug}
    order by name_ru asc
  `
}

/** Admin-only batch resolve by id allowlist. */
export async function resolveCatalog(sql: Sql, body: CatalogResolveBody) {
  const skillIds = uniqUuids(body.skills)
  const buffIds = uniqUuids(body.buffs)
  const itemIds = uniqUuids(body.items)
  const effectIds = uniqUuids(body.skill_addon_effects)

  const [skills, buffs, items, skill_addon_effects] = await Promise.all([
    skillIds.length
      ? sql`
          select id, name_ru, icon_url, class_slug, skill_type, supports_addon, addon_tier
          from skills
          where id = any(${skillIds}::uuid[])
        `
      : Promise.resolve([]),
    buffIds.length
      ? sql`
          select id, name_ru, icon_url, description
          from buffs
          where id = any(${buffIds}::uuid[])
        `
      : Promise.resolve([]),
    itemIds.length
      ? sql`
          select id, name_ru, icon_url, item_type
          from items
          where id = any(${itemIds}::uuid[])
        `
      : Promise.resolve([]),
    effectIds.length
      ? sql`
          select id, key, name_ru, effect_group, tier_labels, sort_order
          from skill_addon_effects
          where id = any(${effectIds}::uuid[])
        `
      : Promise.resolve([]),
  ])

  return { skills, buffs, items, skill_addon_effects }
}

export async function idsExist(
  sql: Sql,
  table: 'skills' | 'buffs' | 'items' | 'skill_addon_effects',
  ids: string[],
  extra?: { classSlug?: string; itemType?: string },
): Promise<Set<string>> {
  if (!ids.length) return new Set()

  if (table === 'skills') {
    const slug = extra?.classSlug
    const rows = slug
      ? await sql`select id from skills where class_slug = ${slug} and id = any(${ids}::uuid[])`
      : await sql`select id from skills where id = any(${ids}::uuid[])`
    return new Set(rows.map((r) => String(r.id)))
  }
  if (table === 'buffs') {
    const rows = await sql`select id from buffs where id = any(${ids}::uuid[])`
    return new Set(rows.map((r) => String(r.id)))
  }
  if (table === 'skill_addon_effects') {
    const rows = await sql`select id from skill_addon_effects where id = any(${ids}::uuid[])`
    return new Set(rows.map((r) => String(r.id)))
  }
  const itemType = extra?.itemType
  const rows = itemType
    ? await sql`select id from items where item_type = ${itemType} and id = any(${ids}::uuid[])`
    : await sql`select id from items where id = any(${ids}::uuid[])`
  return new Set(rows.map((r) => String(r.id)))
}
