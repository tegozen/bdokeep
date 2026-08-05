import { isMorphPresetId } from '@bdokeep/domain'
import type { ApplyCtx, SectionSql } from '../_shared'

export async function applyMorphsSection(tx: SectionSql, ctx: ApplyCtx) {
  const raw = Array.isArray(ctx.payload.morphs) ? ctx.payload.morphs : []
  const rows = raw.map((entry, i) => {
    const e = entry as {
      preset?: unknown
      slot_level?: unknown
      skill_id?: unknown
      effect_ids?: unknown
      sort_order?: unknown
    }
    const effectIds = Array.isArray(e.effect_ids) ? e.effect_ids.map((x) => String(x)) : []
    return {
      guide_id: ctx.guideId,
      preset: String(e.preset || ''),
      slot_level: Number(e.slot_level),
      skill_id: String(e.skill_id || ''),
      effect_id_1: effectIds[0]!,
      effect_id_2: effectIds[1]!,
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
    }
  })
  const replaced = ctx.replacedForApply(
    ctx.payload.replaced_presets,
    rows.map((r) => r.preset),
    isMorphPresetId,
  )

  await tx`
    delete from guide_morphs
    where guide_id = ${ctx.guideId} and preset = any(${replaced}::text[])
  `
  if (rows.length) {
    await tx`
      insert into guide_morphs ${tx(
        rows,
        'guide_id',
        'preset',
        'slot_level',
        'skill_id',
        'effect_id_1',
        'effect_id_2',
        'sort_order',
      )}
    `
  }
}

export async function readMorphsBySlug(sql: SectionSql, slug: string, preset?: string | null) {
  return sql`
    select gm.preset, gm.slot_level, gm.sort_order, gm.skill_id,
      gm.effect_id_1, gm.effect_id_2,
      jsonb_build_object('id', s.id, 'name_ru', s.name_ru, 'icon_url', s.icon_url) as skills
    from classes c
    join class_guides g on g.class_id = c.id
    join guide_morphs gm on gm.guide_id = g.id
    left join skills s on s.id = gm.skill_id
    where c.slug = ${slug} and c.published = true
      and (${preset ?? null}::text is null or gm.preset = ${preset ?? null})
    order by gm.preset, gm.slot_level
  `
}
