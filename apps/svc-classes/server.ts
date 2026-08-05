/**
 * svc-classes — class list + guide hub identity.
 */
import {
  createApp,
  createRouter,
  defineEventHandler,
  getRouterParam,
  createError,
  toNodeListener,
} from 'h3'
import { createServer } from 'node:http'
import postgres from 'postgres'

const PORT = Number(process.env.PORT || 3013)

async function main() {
  const url = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required')
  const sql = postgres(url, { max: 5 })
  const { listPublishedClasses, fetchGuideBundleBySlug } = await import(
    '../../server/utils/queries/guides.ts'
  )

  const app = createApp()
  const router = createRouter()

  router.get('/health', defineEventHandler(() => ({ ok: true, service: 'svc-classes' })))

  router.get(
    '/api/classes',
    defineEventHandler(async () => listPublishedClasses(sql)),
  )

  router.get(
    '/api/classes/:slug/guide',
    defineEventHandler(async (event) => {
      const slug = getRouterParam(event, 'slug')
      if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
      const bundle = await fetchGuideBundleBySlug(sql, slug)
      if (!bundle) throw createError({ statusCode: 404, statusMessage: 'Not found' })
      return bundle
    }),
  )

  app.use(router)
  createServer(toNodeListener(app)).listen(PORT, '0.0.0.0', () => {
    console.log(`[svc-classes] :${PORT}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
