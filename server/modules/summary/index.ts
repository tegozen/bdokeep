import { summaryModeFromSection, type ProposalSection } from '@bdokeep/domain'
import type { ApplyCtx, SectionSql } from '../_shared'

export async function applySummarySection(
  tx: SectionSql,
  ctx: ApplyCtx & { section: ProposalSection },
) {
  const text = String(ctx.payload.text || '').trim()
  if (summaryModeFromSection(ctx.section) === 'succession') {
    await tx`
      update class_guides
      set summary_succession = ${text}
      where id = ${ctx.guideId}
    `
  } else {
    await tx`
      update class_guides
      set summary_awakening = ${text}
      where id = ${ctx.guideId}
    `
  }
}

export async function readSummaryBySlug(sql: SectionSql, slug: string) {
  const rows = await sql`
    select g.summary_awakening, g.summary_succession
    from classes c
    join class_guides g on g.class_id = c.id
    where c.slug = ${slug} and c.published = true
    limit 1
  `
  return rows[0] ?? { summary_awakening: '', summary_succession: '' }
}
