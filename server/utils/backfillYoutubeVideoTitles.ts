import { isPlaceholderVideoTitle, youtubeVideoId } from '@domain'
import { fetchYoutubeTitle } from './youtubeTitle'

export type BackfillYoutubeTitlesResult = {
  classVideosUpdated: number
  proposalsUpdated: number
}

type ClassVideoRow = {
  id: string
  title: string
  youtube_url: string
}

type ProposalRow = {
  id: string
  payload: Record<string, unknown> | null
}

/**
 * Replace synthetic «Видео N» titles with YouTube oEmbed titles
 * for live class_videos and pending video proposals.
 */
export async function backfillYoutubeVideoTitles(): Promise<BackfillYoutubeTitlesResult> {
  const sql = useDb()
  const result: BackfillYoutubeTitlesResult = {
    classVideosUpdated: 0,
    proposalsUpdated: 0,
  }

  const rows = await withDbError(async () => {
    return (await sql`
      select id, title, youtube_url
      from class_videos
    `) as ClassVideoRow[]
  })

  for (const row of rows) {
    if (!isPlaceholderVideoTitle(row.title)) continue
    const ytId = youtubeVideoId(row.youtube_url)
    if (!ytId) continue
    const title = await fetchYoutubeTitle(ytId)
    if (!title || title === row.title) continue
    await withDbError(async () => {
      await sql`
        update class_videos
        set title = ${title}
        where id = ${row.id}
      `
    })
    result.classVideosUpdated += 1
  }

  const proposals = await withDbError(async () => {
    return (await sql`
      select id, payload
      from guide_proposals
      where status = 'pending'
        and section in ('videos_awakening', 'videos_succession')
    `) as ProposalRow[]
  })

  for (const row of proposals) {
    const payload = row.payload && typeof row.payload === 'object' ? { ...row.payload } : null
    if (!payload || !Array.isArray(payload.videos)) continue

    let changed = false
    const videos = []
    for (const entry of payload.videos as Array<Record<string, unknown>>) {
      const next = { ...entry }
      const url = String(next.youtube_url || '')
      const ytId = youtubeVideoId(url)
      if (ytId && isPlaceholderVideoTitle(String(next.title || ''))) {
        const title = await fetchYoutubeTitle(ytId)
        if (title) {
          next.title = title
          changed = true
        }
      }
      videos.push(next)
    }

    if (!changed) continue
    payload.videos = videos
    await withDbError(async () => {
      await sql`
        update guide_proposals
        set payload = ${sql.json(payload)}
        where id = ${row.id}
      `
    })
    result.proposalsUpdated += 1
  }

  return result
}
