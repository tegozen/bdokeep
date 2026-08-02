import type postgres from 'postgres'
import { withCodexIconCacheBust } from '@/shared/lib/codexIcon'
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
  const rows = await sql`
    select id, name_ru, icon_url, description
    from buffs
    order by name_ru asc
  `
  return withCodexIconCacheBust(rows)
}

export async function listItemsByType(
  sql: Sql,
  itemType: 'crystal' | 'relic' | 'lightstone' | 'essence',
) {
  const rows = await sql`
    select id, name_ru, icon_url, item_type, raw
    from items
    where item_type = ${itemType}
    order by coalesce((raw->>'sorting')::int, 0) desc, name_ru asc
  `
  return withCodexIconCacheBust(rows)
}

export async function listSkillAddonEffects(sql: Sql) {
  return sql`
    select id, key, name_ru, effect_group, tier_labels, sort_order
    from skill_addon_effects
    order by sort_order asc
  `
}

export type LightstoneSetCatalogRow = {
  id: string
  name_ru: string
  name_en: string | null
  category: 'combat' | 'lifeskill'
  bonuses: Array<{ key: string; label: string; value: number }>
  normal: Array<{ id: string; codex_id: string; name_ru: string; icon_url: string | null }>
  enhanced: Array<{ id: string; codex_id: string; name_ru: string; icon_url: string | null }>
}

export async function listLightstoneSets(sql: Sql): Promise<LightstoneSetCatalogRow[]> {
  const rows = await sql`
    select
      s.id,
      s.name_ru,
      s.name_en,
      s.category,
      s.bonuses,
      s.normal_codex_ids,
      s.enhanced_codex_ids
    from lightstone_sets s
    where s.category = 'combat'
    order by s.name_ru asc
  `

  const allIds = new Set<string>()
  for (const row of rows) {
    for (const id of row.normal_codex_ids as string[]) allIds.add(String(id))
    for (const id of row.enhanced_codex_ids as string[]) allIds.add(String(id))
  }

  const idList = [...allIds]
  const items =
    idList.length === 0
      ? []
      : await sql`
          select id, codex_id, name_ru, icon_url
          from items
          where item_type = 'lightstone'
            and codex_id = any(${idList}::text[])
        `
  const byCodex = new Map(
    withCodexIconCacheBust(items).map((it) => [
      String(it.codex_id),
      {
        id: String(it.id),
        codex_id: String(it.codex_id),
        name_ru: String(it.name_ru),
        icon_url: (it.icon_url as string | null) ?? null,
      },
    ]),
  )

  const resolve = (codexIds: string[]) =>
    (codexIds || [])
      .map((cid) => byCodex.get(String(cid)))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

  return rows.map((row) => ({
    id: String(row.id),
    name_ru: String(row.name_ru),
    name_en: row.name_en != null ? String(row.name_en) : null,
    category: row.category === 'lifeskill' ? 'lifeskill' : 'combat',
    bonuses: (Array.isArray(row.bonuses) ? row.bonuses : []) as LightstoneSetCatalogRow['bonuses'],
    normal: resolve(row.normal_codex_ids as string[]),
    enhanced: resolve(row.enhanced_codex_ids as string[]),
  }))
}

export async function listSkillsForClass(sql: Sql, classSlug: string) {
  const rows = await sql`
    select id, name_ru, icon_url, class_slug, skill_type, supports_addon, addon_tier, addon_effect_keys
    from skills
    where class_slug = ${classSlug}
    order by name_ru asc
  `
  return withCodexIconCacheBust(rows)
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
          select id, name_ru, icon_url, class_slug, skill_type, supports_addon, addon_tier, addon_effect_keys
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
          select id, name_ru, icon_url, item_type, raw
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

  return {
    skills: withCodexIconCacheBust(skills),
    buffs: withCodexIconCacheBust(buffs),
    items: withCodexIconCacheBust(items),
    skill_addon_effects,
  }
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
