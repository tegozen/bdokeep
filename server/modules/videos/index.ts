import { createError } from 'h3'
import { videoModeFromSection, type ProposalSection } from '@bdokeep/domain'
import type { ParsedGuideVideo } from '../../utils/parseVideosPayload'
import type { ApplyCtx, SectionSql } from '../_shared'

export async function applyVideosSection(
  tx: SectionSql,
  ctx: ApplyCtx & {
    section: ProposalSection
    verifiedVideos: ParsedGuideVideo[] | null
  },
) {
  if (!ctx.verifiedVideos) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные данные видео' })
  }

  const mode = videoModeFromSection(ctx.section)
  const prevRows = await tx`
    select youtube_url, status, status_since
    from class_videos
    where class_id = ${ctx.classId} and mode = ${mode}
  `
  const prevByUrl = new Map(
    prevRows.map((r) => [
      String(r.youtube_url),
      {
        status: String(r.status || 'ready'),
        status_since: r.status_since as Date | string,
      },
    ]),
  )

  const rows = ctx.verifiedVideos.map((v) => {
    const prev = prevByUrl.get(v.youtube_url)
    const status = v.status
    let statusSince: Date | string = new Date()
    if (status === 'processing' && prev?.status === 'processing' && prev.status_since) {
      statusSince = prev.status_since
    }
    return {
      class_id: ctx.classId,
      title: v.title,
      youtube_url: v.youtube_url,
      sort_order: v.sort_order,
      mode,
      status,
      status_since: statusSince,
    }
  })

  await tx`
    delete from class_videos
    where class_id = ${ctx.classId} and mode = ${mode}
  `
  if (rows.length) {
    await tx`
      insert into class_videos ${tx(
        rows,
        'class_id',
        'title',
        'youtube_url',
        'sort_order',
        'mode',
        'status',
        'status_since',
      )}
    `
  }
}

export async function readVideosBySlug(sql: SectionSql, slug: string, mode?: string | null) {
  return sql`
    select v.*
    from classes c
    join class_videos v on v.class_id = c.id
    where c.slug = ${slug} and c.published = true
      and (${mode ?? null}::text is null or v.mode = ${mode ?? null})
    order by v.sort_order
  `
}
