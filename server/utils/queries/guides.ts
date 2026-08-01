import type postgres from 'postgres'

type Sql = ReturnType<typeof postgres>

export async function listPublishedClasses(sql: Sql) {
  const rows = await sql`
    select
      c.id,
      c.slug,
      c.name_ru,
      c.icon_url,
      c.portrait_url,
      c.awakening_name,
      c.succession_name,
      c.sort_order,
      c.published,
      c.tier,
      (
        (g.id is not null and coalesce(trim(g.summary), '') <> '')
        or exists (select 1 from guide_buffs x where x.guide_id = g.id)
        or exists (select 1 from guide_relics x where x.guide_id = g.id)
        or exists (select 1 from guide_lightstones x where x.guide_id = g.id)
        or exists (select 1 from guide_crystals x where x.guide_id = g.id)
        or exists (select 1 from guide_essence x where x.guide_id = g.id)
        or exists (select 1 from guide_combo_steps x where x.guide_id = g.id)
        or exists (select 1 from guide_morphs x where x.guide_id = g.id)
        or exists (select 1 from class_videos v where v.class_id = c.id)
      ) as has_content
    from classes c
    left join class_guides g on g.class_id = c.id
    where c.published = true
    order by c.sort_order asc
  `

  const mapped = rows.map((row) => ({
    ...row,
    tier: row.tier == null ? null : Number(row.tier),
    has_content: Boolean(row.has_content),
  }))

  mapped.sort((a, b) => {
    const byContent = Number(Boolean(b.has_content)) - Number(Boolean(a.has_content))
    if (byContent !== 0) return byContent
    const tierA = a.tier == null ? -1 : Number(a.tier)
    const tierB = b.tier == null ? -1 : Number(b.tier)
    if (tierA !== tierB) return tierB - tierA
    return Number(a.sort_order) - Number(b.sort_order)
  })

  return mapped
}

export async function fetchGuideBundleBySlug(sql: Sql, slug: string) {
  const empty = {
    comboSteps: [] as unknown[],
    buffs: [] as unknown[],
    relics: [] as unknown[],
    lightstones: [] as unknown[],
    crystals: [] as unknown[],
    essence: [] as unknown[],
    morphs: [] as unknown[],
  }

  const klassRows = await sql`
    select *
    from classes
    where slug = ${slug} and published = true
    limit 1
  `
  const klassRow = klassRows[0]
  if (!klassRow) return null
  const klass = {
    ...klassRow,
    tier: klassRow.tier == null ? null : Number(klassRow.tier),
  }

  const [guideRows, videoRows] = await Promise.all([
    sql`select * from class_guides where class_id = ${klass.id} limit 1`,
    sql`
      select *
      from class_videos
      where class_id = ${klass.id}
      order by sort_order asc
    `,
  ])

  const guideRow = guideRows[0] ?? null
  const guide = guideRow
    ? {
        ...guideRow,
        section_updates:
          guideRow.section_updates && typeof guideRow.section_updates === 'object'
            ? guideRow.section_updates
            : {},
      }
    : null
  const videos = videoRows

  if (!guide) {
    return {
      class: klass,
      guide: null,
      videos,
      ...empty,
    }
  }

  const guideId = guide.id

  const [comboSteps, buffs, relics, lightstones, crystals, essence, morphs] = await Promise.all([
    sql`
      select
        gcs.id,
        gcs.mode,
        gcs.notes,
        gcs.sort_order,
        case when s.id is null then null else json_build_object(
          'id', s.id,
          'name_ru', s.name_ru,
          'icon_url', s.icon_url,
          'class_slug', s.class_slug
        ) end as skills
      from guide_combo_steps gcs
      left join skills s on s.id = gcs.skill_id
      where gcs.guide_id = ${guideId}
      order by gcs.sort_order asc
    `,
    sql`
      select
        gb.id,
        gb.slot,
        gb.preset,
        gb.group_name,
        gb.notes,
        gb.sort_order,
        case when b.id is null then null else json_build_object(
          'id', b.id,
          'name_ru', b.name_ru,
          'icon_url', b.icon_url,
          'description', b.description
        ) end as buffs
      from guide_buffs gb
      left join buffs b on b.id = gb.buff_id
      where gb.guide_id = ${guideId}
      order by gb.sort_order asc
    `,
    sql`
      select
        gr.id,
        gr.slot,
        gr.preset,
        gr.notes,
        gr.sort_order,
        case when i.id is null then null else json_build_object(
          'id', i.id,
          'name_ru', i.name_ru,
          'icon_url', i.icon_url,
          'item_type', i.item_type
        ) end as items
      from guide_relics gr
      left join items i on i.id = gr.item_id
      where gr.guide_id = ${guideId}
      order by gr.sort_order asc
    `,
    sql`
      select
        gl.id,
        gl.slot,
        gl.preset,
        gl.notes,
        gl.sort_order,
        case when i.id is null then null else json_build_object(
          'id', i.id,
          'name_ru', i.name_ru,
          'icon_url', i.icon_url,
          'item_type', i.item_type
        ) end as items
      from guide_lightstones gl
      left join items i on i.id = gl.item_id
      where gl.guide_id = ${guideId}
      order by gl.sort_order asc
    `,
    sql`
      select
        gc.id,
        gc.slot,
        gc.preset,
        gc.notes,
        gc.sort_order,
        case when i.id is null then null else json_build_object(
          'id', i.id,
          'name_ru', i.name_ru,
          'icon_url', i.icon_url,
          'item_type', i.item_type
        ) end as items
      from guide_crystals gc
      left join items i on i.id = gc.item_id
      where gc.guide_id = ${guideId}
      order by gc.sort_order asc
    `,
    sql`
      select
        ge.id,
        ge.slot,
        ge.notes,
        ge.sort_order,
        case when i.id is null then null else json_build_object(
          'id', i.id,
          'name_ru', i.name_ru,
          'icon_url', i.icon_url,
          'item_type', i.item_type
        ) end as items
      from guide_essence ge
      left join items i on i.id = ge.item_id
      where ge.guide_id = ${guideId}
      order by ge.sort_order asc
    `,
    sql`
      select
        gm.id,
        gm.preset,
        gm.slot_level,
        gm.sort_order,
        case when s.id is null then null else json_build_object(
          'id', s.id,
          'name_ru', s.name_ru,
          'icon_url', s.icon_url,
          'class_slug', s.class_slug,
          'skill_type', s.skill_type,
          'supports_addon', s.supports_addon,
          'addon_tier', s.addon_tier
        ) end as skills,
        case when e1.id is null then null else json_build_object(
          'id', e1.id,
          'key', e1.key,
          'name_ru', e1.name_ru,
          'effect_group', e1.effect_group,
          'tier_labels', e1.tier_labels
        ) end as effect1,
        case when e2.id is null then null else json_build_object(
          'id', e2.id,
          'key', e2.key,
          'name_ru', e2.name_ru,
          'effect_group', e2.effect_group,
          'tier_labels', e2.tier_labels
        ) end as effect2
      from guide_morphs gm
      left join skills s on s.id = gm.skill_id
      left join skill_addon_effects e1 on e1.id = gm.effect_id_1
      left join skill_addon_effects e2 on e2.id = gm.effect_id_2
      where gm.guide_id = ${guideId}
      order by gm.slot_level asc
    `,
  ])

  return {
    class: klass,
    guide,
    videos,
    comboSteps,
    buffs,
    relics,
    lightstones,
    crystals,
    essence,
    morphs,
  }
}
