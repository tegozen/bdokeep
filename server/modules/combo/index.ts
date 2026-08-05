import { comboModeFromSection, type ProposalSection } from '@bdokeep/domain'
import type { ApplyCtx, SectionSql } from '../_shared'

export async function applyComboSection(
  tx: SectionSql,
  ctx: ApplyCtx & { section: ProposalSection },
) {
  const mode = comboModeFromSection(ctx.section)
  type ComboEntry = { title?: unknown; notes?: unknown; skill_ids?: unknown }
  let rawCombos: ComboEntry[] = []
  if (Array.isArray(ctx.payload.combos)) {
    rawCombos = ctx.payload.combos as ComboEntry[]
  } else if (Array.isArray(ctx.payload.skill_ids)) {
    rawCombos = [{ skill_ids: ctx.payload.skill_ids }]
  }

  await tx`
    delete from guide_combos
    where guide_id = ${ctx.guideId} and mode = ${mode}
  `

  for (let ci = 0; ci < rawCombos.length; ci++) {
    const entry = rawCombos[ci]!
    const skillIds = Array.isArray(entry.skill_ids)
      ? entry.skill_ids.map((x) => String(x))
      : []
    if (!skillIds.length) continue
    const title = String(entry.title ?? '').trim() || null
    const notes = String(entry.notes ?? '').trim() || null
    const inserted = await tx`
      insert into guide_combos (guide_id, mode, sort_order, title, notes)
      values (${ctx.guideId}, ${mode}, ${ci}, ${title}, ${notes})
      returning id
    `
    const comboId = inserted[0]?.id
    if (!comboId) continue
    const rows = skillIds.map((skill_id, i) => ({
      guide_id: ctx.guideId,
      combo_id: comboId,
      skill_id,
      sort_order: i,
    }))
    await tx`
      insert into guide_combo_steps ${tx(rows, 'guide_id', 'combo_id', 'skill_id', 'sort_order')}
    `
  }
}

export async function readComboBySlug(sql: SectionSql, slug: string, mode?: string | null) {
  return sql`
    select
      gc.id, gc.mode, gc.sort_order, gc.title, gc.notes,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', gs.id,
              'sort_order', gs.sort_order,
              'skills', jsonb_build_object(
                'id', s.id,
                'name_ru', s.name_ru,
                'icon_url', s.icon_url
              )
            ) order by gs.sort_order
          )
          from guide_combo_steps gs
          left join skills s on s.id = gs.skill_id
          where gs.combo_id = gc.id
        ),
        '[]'::jsonb
      ) as steps
    from classes c
    join class_guides g on g.class_id = c.id
    join guide_combos gc on gc.guide_id = g.id
    where c.slug = ${slug} and c.published = true
      and (${mode ?? null}::text is null or gc.mode = ${mode ?? null})
    order by gc.mode, gc.sort_order
  `
}
