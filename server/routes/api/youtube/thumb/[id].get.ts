const THUMB_WINDOW_MS = 60 * 1000
const THUMB_MAX_HITS = 60

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)
  if (!checkRateLimit(`yt-thumb:${ip}`, THUMB_MAX_HITS, THUMB_WINDOW_MS)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Слишком много запросов превью. Подождите.',
    })
  }

  const id = String(getRouterParam(event, 'id') || '')
  if (!isYoutubeVideoId(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid video id' })
  }

  const thumb = await resolveYoutubeThumb(id)
  setHeader(event, 'Content-Type', thumb.contentType)
  setHeader(event, 'Cache-Control', thumb.cacheControl)
  setHeader(event, 'X-Thumb-Source', thumb.fromYoutube ? 'youtube' : 'placeholder')
  return thumb.body
})
