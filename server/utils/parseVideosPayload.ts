import { createError } from 'h3'
import {
  MAX_VIDEOS,
  isPlaceholderVideoTitle,
  sanitizeYoutubeUrl,
  youtubeVideoId,
} from '@domain'
import { youtubeVideoHasThumb } from './youtubeThumb'
import { fetchYoutubeTitle } from './youtubeTitle'

export type VideoReadyStatus = 'ready' | 'processing'

export type ParsedGuideVideo = {
  title: string
  youtube_url: string
  sort_order: number
  status: VideoReadyStatus
}

export type ParseVideosOptions = {
  /** Cron cleanup may clear all slots for a mode. Public POST must not. */
  allowEmpty?: boolean
}

/** Validate shape; missing YouTube thumb → status processing (not an error). */
export async function parseVideosPayload(
  raw: unknown,
  opts?: ParseVideosOptions,
): Promise<ParsedGuideVideo[]> {
  if (!Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Добавьте хотя бы одно видео' })
  }
  if (raw.length === 0) {
    if (opts?.allowEmpty) return []
    throw createError({ statusCode: 400, statusMessage: 'Добавьте хотя бы одно видео' })
  }
  if (raw.length > MAX_VIDEOS) {
    throw createError({ statusCode: 400, statusMessage: `Максимум ${MAX_VIDEOS} видео` })
  }

  const videos: ParsedGuideVideo[] = []
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i] as {
      title?: unknown
      youtube_url?: unknown
      sort_order?: unknown
      status?: unknown
    }
    const urlRaw = String(entry?.youtube_url || '').trim()
    const safe = sanitizeYoutubeUrl(urlRaw)
    const id = youtubeVideoId(urlRaw)
    const slotNo = i + 1
    if (!safe || !id) {
      throw createError({
        statusCode: 400,
        statusMessage: `Видео ${slotNo}: некорректная ссылка на YouTube`,
      })
    }
    const hasThumb = await youtubeVideoHasThumb(id)
    // Prefer live probe; payload status is ignored so approve re-checks ytimg.
    const status: VideoReadyStatus = hasThumb ? 'ready' : 'processing'
    const titleRaw = String(entry?.title || '').trim()
    const fallback = `Видео ${slotNo}`
    let title = isPlaceholderVideoTitle(titleRaw)
      ? fallback
      : titleRaw.slice(0, 120)
    if (isPlaceholderVideoTitle(title)) {
      const fetched = await fetchYoutubeTitle(id)
      if (fetched) title = fetched
    }
    videos.push({
      title,
      youtube_url: safe,
      sort_order: i,
      status,
    })
  }

  return videos
}
