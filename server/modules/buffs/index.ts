import { isCrystalPresetId } from '@bdokeep/domain'
import type { ApplyCtx, SectionSql } from '../_shared'

export async function applyBuffsSection(tx: SectionSql, ctx: ApplyCtx) {
  const rawBuffs = Array.isArray(ctx.payload.buffs) ? ctx.payload.buffs : []
  const rows = rawBuffs.map((entry, i) => {
    const e = entry as {
      preset?: unknown
      buff_id?: unknown
      sort_order?: unknown
    }
    return {
      guide_id: ctx.guideId,
      buff_id: String(e.buff_id || ''),
      preset: String(e.preset || 't1'),
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
    }
  })
  const replaced = ctx.replacedForApply(
    ctx.payload.replaced_presets,
    rows.map((r) => r.preset),
    isCrystalPresetId,
  )

  await tx`
    delete from guide_buffs
    where guide_id = ${ctx.guideId} and preset = any(${replaced}::text[])
  `
  if (rows.length) {
    await tx`
      insert into guide_buffs ${tx(rows, 'guide_id', 'buff_id', 'preset', 'sort_order')}
    `
  }
}

export async function readBuffsBySlug(sql: SectionSql, slug: string, preset?: string | null) {
  return sql`
    select gb.preset, gb.sort_order, gb.buff_id,
      jsonb_build_object('id', b.id, 'name_ru', b.name_ru, 'icon_url', b.icon_url) as buffs
    from classes c
    join class_guides g on g.class_id = c.id
    join guide_buffs gb on gb.guide_id = g.id
    join buffs b on b.id = gb.buff_id
    where c.slug = ${slug} and c.published = true
      and (${preset ?? null}::text is null or gb.preset = ${preset ?? null})
    order by gb.preset, gb.sort_order
  `
}
