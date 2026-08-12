import {
  CRON_AUTHOR_LABEL,
  VIDEO_PROCESSING_TTL_MS,
  youtubeVideoId,
  type ProposalSection,
} from '@domain'
import { applyPendingOrReject } from './applyPendingOrReject'
import { backfillYoutubeVideoTitles } from './backfillYoutubeVideoTitles'
import { clearYoutubeThumbCache, youtubeVideoHasThumb } from './youtubeThumb'

type VideoRow = {
  id: string
  class_id: string
  class_slug: string
  title: string
  youtube_url: string
  sort_order: number
  mode: string
  status: string
  status_since: Date | string
}

function sectionForMode(mode: string): ProposalSection {
  return mode === 'succession' ? 'videos_succession' : 'videos_awakening'
}

export type PollYoutubeVideoStatusResult = {
  markedReady: number
  removedExpired: number
  proposalsCreated: number
  titlesBackfilled: number
  proposalTitlesBackfilled: number
}

/**
 * Mark processing videos ready when ytimg has a thumb;
 * after TTL, remove via approved guide_proposals (author=cron);
 * backfill placeholder «Видео N» titles from YouTube oEmbed.
 */
export async function pollYoutubeVideoStatus(): Promise<PollYoutubeVideoStatusResult> {
  const sql = useDb()
  const titles = await backfillYoutubeVideoTitles()
  const result: PollYoutubeVideoStatusResult = {
    markedReady: 0,
    removedExpired: 0,
    proposalsCreated: 0,
    titlesBackfilled: titles.classVideosUpdated,
    proposalTitlesBackfilled: titles.proposalsUpdated,
  }

  const processing = await withDbError(async () => {
    return (await sql`
      select
        v.id,
        v.class_id,
        c.slug as class_slug,
        v.title,
        v.youtube_url,
        v.sort_order,
        v.mode,
        v.status,
        v.status_since
      from class_videos v
      join classes c on c.id = v.class_id
      where v.status = 'processing'
      order by v.class_id, v.mode, v.sort_order
    `) as VideoRow[]
  })

  if (!processing.length) return result

  const now = Date.now()
  const readyIds: string[] = []
  const expired: VideoRow[] = []

  for (const row of processing) {
    const ytId = youtubeVideoId(row.youtube_url)
    if (!ytId) {
      expired.push(row)
      continue
    }

    const since = new Date(row.status_since).getTime()
    const isExpired =
      !Number.isFinite(since) || now - since >= VIDEO_PROCESSING_TTL_MS

    clearYoutubeThumbCache(ytId)
    if (await youtubeVideoHasThumb(ytId)) {
      readyIds.push(row.id)
      continue
    }

    if (isExpired) expired.push(row)
  }

  if (readyIds.length) {
    await withDbError(async () => {
      await sql`
        update class_videos
        set status = 'ready', status_since = now()
        where id = any(${readyIds}::uuid[])
      `
    })
    result.markedReady = readyIds.length
  }

  if (!expired.length) return result

  const groups = new Map<string, VideoRow[]>()
  for (const row of expired) {
    const key = `${row.class_id}:${row.mode}`
    const list = groups.get(key)
    if (list) list.push(row)
    else groups.set(key, [row])
  }

  for (const [, dead] of groups) {
    const first = dead[0]!
    const expiredIds = new Set(dead.map((r) => r.id))

    const allMode = await withDbError(async () => {
      return (await sql`
        select
          v.id,
          v.class_id,
          c.slug as class_slug,
          v.title,
          v.youtube_url,
          v.sort_order,
          v.mode,
          v.status,
          v.status_since
        from class_videos v
        join classes c on c.id = v.class_id
        where v.class_id = ${first.class_id} and v.mode = ${first.mode}
        order by v.sort_order asc
      `) as VideoRow[]
    })

    const remaining = allMode.filter((r) => !expiredIds.has(r.id))
    const section = sectionForMode(first.mode)
    const payloadVideos = remaining.map((r, i) => ({
      title: r.title,
      youtube_url: r.youtube_url,
      sort_order: i,
      status: r.status === 'processing' ? 'processing' : 'ready',
    }))

    const existingPending = await withDbError(async () => {
      const rows = await sql`
        select id from guide_proposals
        where
          class_id = ${first.class_id}
          and section = ${section}
          and status = 'pending'
          and author_label = ${CRON_AUTHOR_LABEL}
        limit 1
      `
      return rows[0] ?? null
    })
    if (existingPending) continue

    const inserted = await withDbError(async () => {
      const rows = await sql`
        insert into guide_proposals (
          class_id,
          class_slug,
          section,
          payload,
          author_label,
          status
        )
        values (
          ${first.class_id},
          ${first.class_slug},
          ${section},
          ${sql.json({ videos: payloadVideos })},
          ${CRON_AUTHOR_LABEL},
          'pending'
        )
        returning id, class_id, class_slug, section, payload, status, author_label
      `
      return rows[0] ?? null
    })

    if (!inserted) continue

    await applyPendingOrReject(
      {
        id: String(inserted.id),
        class_id: String(inserted.class_id),
        class_slug: inserted.class_slug == null ? undefined : String(inserted.class_slug),
        section: String(inserted.section) as ProposalSection,
        payload: (inserted.payload || {}) as Record<string, unknown>,
        status: String(inserted.status),
        author_label:
          inserted.author_label == null ? null : String(inserted.author_label),
      },
      {
        reviewNote: 'автоснятие: нет превью YouTube >48ч',
        allowEmptyVideos: true,
      },
    )

    result.proposalsCreated += 1
    result.removedExpired += dead.length
  }

  return result
}
