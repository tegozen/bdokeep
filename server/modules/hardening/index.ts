import { isCrystalPresetId } from '@bdokeep/domain'
import type { ApplyCtx, SectionSql } from '../_shared'

export async function applyHardeningSection(tx: SectionSql, ctx: ApplyCtx) {
  const raw = Array.isArray(ctx.payload.hardening) ? ctx.payload.hardening : []
  const rows = raw.map((entry, i) => {
    const e = entry as {
      preset?: unknown
      slot?: unknown
      item_id?: unknown
      sort_order?: unknown
    }
    return {
      guide_id: ctx.guideId,
      item_id: String(e.item_id || ''),
      slot: String(e.slot || ''),
      preset: String(e.preset || ''),
      sort_order: typeof e.sort_order === 'number' ? e.sort_order : i,
    }
  })
  const replaced = ctx.replacedForApply(
    ctx.payload.replaced_presets,
    rows.map((r) => r.preset),
    isCrystalPresetId,
  )

  await tx`
    delete from guide_essence
    where guide_id = ${ctx.guideId} and preset = any(${replaced}::text[])
  `
  if (rows.length) {
    await tx`
      insert into guide_essence ${tx(rows, 'guide_id', 'item_id', 'slot', 'preset', 'sort_order')}
    `
  }
}

export async function readHardeningBySlug(sql: SectionSql, slug: string, preset?: string | null) {
  return sql`
    select gc.preset, gc.slot, gc.sort_order, gc.item_id,
      jsonb_build_object('id', i.id, 'name_ru', i.name_ru, 'icon_url', i.icon_url) as item
    from classes c
    join class_guides g on g.class_id = c.id
    join guide_essence gc on gc.guide_id = g.id
    join items i on i.id = gc.item_id
    where c.slug = ${slug} and c.published = true
      and (${preset ?? null}::text is null or gc.preset = ${preset ?? null})
    order by gc.preset, gc.sort_order
  `
}
