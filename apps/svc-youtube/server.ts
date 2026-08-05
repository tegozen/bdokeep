/**
 * svc-youtube — thumb proxy microservice.
 * Public path (via internal nginx): /api/youtube/thumb/:id
 */
import { createApp, createRouter, defineEventHandler, getRouterParam, setHeader, createError, toNodeListener } from 'h3'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
import { register } from 'node:module'

// Load TS sources from monorepo via tsx when started with: npx tsx apps/svc-youtube/server.ts
const PORT = Number(process.env.PORT || 3011)

async function main() {
  // Dynamic import compiled/ts paths — entry is server.ts run via tsx
  const { isYoutubeVideoId } = await import('../mf-shared/domain/youtube.ts')
  const { resolveYoutubeThumb } = await import('../../server/utils/youtubeThumb.ts')
  const { checkRateLimit, clientIp, formatRetryAfterRu } = await import('../../server/utils/rateLimit.ts')

  const app = createApp()
  const router = createRouter()

  router.get(
    '/health',
    defineEventHandler(() => ({ ok: true, service: 'svc-youtube' })),
  )

  router.get(
    '/api/youtube/thumb/:id',
    defineEventHandler(async (event) => {
      const THUMB_WINDOW_MS = 60 * 1000
      const THUMB_MAX_HITS = 60
      const ip = clientIp(event)
      const limit = checkRateLimit(`yt-thumb:${ip}`, THUMB_MAX_HITS, THUMB_WINDOW_MS)
      if (!limit.allowed) {
        const wait = formatRetryAfterRu(limit.retryAfterMs)
        throw createError({
          statusCode: 429,
          statusMessage: `Слишком много запросов превью. Подождите ${wait}.`,
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
    }),
  )

  app.use(router)
  createServer(toNodeListener(app)).listen(PORT, '0.0.0.0', () => {
    console.log(`[svc-youtube] :${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
