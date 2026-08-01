export default defineEventHandler(async (event) => {
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
