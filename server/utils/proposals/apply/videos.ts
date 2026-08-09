import { createError } from 'h3'
import { videoModeFromSection } from '@domain'
import type { ApplySectionContext } from './types'

export async function applyVideos(ctx: ApplySectionContext): Promise<void> {
  const { tx, proposal, section, verifiedVideos } = ctx
  if (!verifiedVideos) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные данные видео' })
  }

  const mode = videoModeFromSection(section)
  const prevRows = await tx`
    select youtube_url, status, status_since
    from class_videos
    where class_id = ${proposal.class_id} and mode = ${mode}
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

  const rows = verifiedVideos.map((v) => {
    const prev = prevByUrl.get(v.youtube_url)
    const status = v.status
    let statusSince: Date | string = new Date()
    if (
      status === 'processing' &&
      prev?.status === 'processing' &&
      prev.status_since
    ) {
      statusSince = prev.status_since
    }
    return {
      class_id: proposal.class_id,
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
    where class_id = ${proposal.class_id} and mode = ${mode}
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
