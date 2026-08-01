import { MAX_VIDEOS, sanitizeYoutubeUrl, youtubeVideoId } from '@domain'
import { youtubeVideoHasThumb } from './youtubeThumb'

export type ParsedGuideVideo = {
  title: string
  youtube_url: string
  sort_order: number
}

/** Validate shape + that each video has a real YouTube thumbnail (exists). */
export async function parseVideosPayload(raw: unknown): Promise<ParsedGuideVideo[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
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
    if (!(await youtubeVideoHasThumb(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: `Видео ${slotNo}: недоступно или не существует на YouTube`,
      })
    }
    const titleRaw = String(entry?.title || '').trim()
    const defaultTitle = `Видео ${slotNo}`
    const title =
      !titleRaw || /^Видео\s+\d+$/i.test(titleRaw)
        ? defaultTitle
        : titleRaw.slice(0, 120)
    videos.push({
      title,
      youtube_url: safe,
      sort_order: i,
    })
  }

  return videos
}
