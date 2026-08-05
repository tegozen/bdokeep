/**
 * Generic section microservice — READ + internal validate/apply hooks.
 * DOMAIN env: crystals | relics | hardening | morphs | combo | buffs | videos | summary
 */
import {
  createApp,
  createRouter,
  defineEventHandler,
  getRouterParam,
  getQuery,
  readBody,
  createError,
  toNodeListener,
} from 'h3'
import { createServer } from 'node:http'
import postgres from 'postgres'

const PORT = Number(process.env.PORT || 3020)
const DOMAIN = process.env.SECTION_DOMAIN || 'crystals'

function useSql() {
  const url = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required')
  return postgres(url, { max: 5 })
}

async function main() {
  const sql = useSql()
  const readers: Record<string, (sql: any, slug: string, q: any) => Promise<any>> = {
    crystals: async (s, slug, q) => {
      const { readCrystalsBySlug } = await import('../../server/modules/crystals/index.ts')
      return readCrystalsBySlug(s, slug, q.preset ?? null)
    },
    relics: async (s, slug, q) => {
      const { readRelicsBySlug } = await import('../../server/modules/relics/index.ts')
      return readRelicsBySlug(s, slug, q.preset ?? null)
    },
    hardening: async (s, slug, q) => {
      const { readHardeningBySlug } = await import('../../server/modules/hardening/index.ts')
      return readHardeningBySlug(s, slug, q.preset ?? null)
    },
    morphs: async (s, slug, q) => {
      const { readMorphsBySlug } = await import('../../server/modules/morphs/index.ts')
      return readMorphsBySlug(s, slug, q.preset ?? null)
    },
    combo: async (s, slug, q) => {
      const { readComboBySlug } = await import('../../server/modules/combo/index.ts')
      return readComboBySlug(s, slug, q.mode ?? null)
    },
    buffs: async (s, slug, q) => {
      const { readBuffsBySlug } = await import('../../server/modules/buffs/index.ts')
      return readBuffsBySlug(s, slug, q.preset ?? null)
    },
    videos: async (s, slug, q) => {
      const { readVideosBySlug } = await import('../../server/modules/videos/index.ts')
      return readVideosBySlug(s, slug, q.mode ?? null)
    },
    summary: async (s, slug) => {
      const { readSummaryBySlug } = await import('../../server/modules/summary/index.ts')
      return readSummaryBySlug(s, slug)
    },
  }

  const reader = readers[DOMAIN]
  if (!reader) throw new Error(`Unknown SECTION_DOMAIN=${DOMAIN}`)

  const app = createApp()
  const router = createRouter()

  router.get(
    '/health',
    defineEventHandler(() => ({ ok: true, service: `svc-${DOMAIN}` })),
  )

  router.get(
    `/api/sections/${DOMAIN}/:slug`,
    defineEventHandler(async (event) => {
      const slug = getRouterParam(event, 'slug')
      if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
      return reader(sql, slug, getQuery(event))
    }),
  )

  // Orchestrator hooks — full apply still runs in host/proposals until cutover complete.
  router.post(
    '/internal/ping',
    defineEventHandler(() => ({ ok: true, domain: DOMAIN })),
  )

  router.post(
    '/internal/apply',
    defineEventHandler(async (event) => {
      const body = await readBody(event)
      return { ok: true, domain: DOMAIN, received: Boolean(body?.section) }
    }),
  )

  app.use(router)
  createServer(toNodeListener(app)).listen(PORT, '0.0.0.0', () => {
    console.log(`[svc-${DOMAIN}] :${PORT}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
