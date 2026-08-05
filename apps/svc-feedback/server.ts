/**
 * svc-feedback — feedback submit + admin inbox API.
 */
import {
  createApp,
  createRouter,
  defineEventHandler,
  readBody,
  getQuery,
  getRouterParam,
  createError,
  toNodeListener,
} from 'h3'
import { createServer } from 'node:http'
import postgres from 'postgres'

const PORT = Number(process.env.PORT || 3012)
const MAX_BODY_LEN = 2000
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function useSql() {
  const url = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required')
  return postgres(url, { max: 5 })
}

async function main() {
  const {
    assertSameOrigin,
  } = await import('../../server/utils/csrfOrigin.ts')
  const { checkRateLimit, clientIp, formatRetryAfterRu } = await import(
    '../../server/utils/rateLimit.ts'
  )
  const { requireAdmin } = await import('../../server/utils/adminAuth.ts')

  const sql = useSql()
  const app = createApp()
  const router = createRouter()

  router.get(
    '/health',
    defineEventHandler(() => ({ ok: true, service: 'svc-feedback' })),
  )

  router.post(
    '/api/feedback',
    defineEventHandler(async (event) => {
      assertSameOrigin(event)
      const body = (await readBody(event)) as {
        body?: string
        classSlug?: string
        website?: string
      }
      if (body.website) return { ok: true }

      const ip = clientIp(event)
      const limit = checkRateLimit(`feedback:${ip}`)
      if (!limit.allowed) {
        const wait = formatRetryAfterRu(limit.retryAfterMs)
        throw createError({
          statusCode: 429,
          statusMessage: `Слишком много сообщений. Подождите ${wait}.`,
        })
      }

      const text = String(body.body || '').trim()
      if (!text) throw createError({ statusCode: 400, statusMessage: 'Введите сообщение' })
      if (text.length > MAX_BODY_LEN) {
        throw createError({
          statusCode: 400,
          statusMessage: `Сообщение слишком длинное (макс. ${MAX_BODY_LEN})`,
        })
      }

      const slug = String(body.classSlug || '')
        .trim()
        .toLowerCase()
      if (slug && !/^[a-z0-9-]+$/.test(slug)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный класс' })
      }

      let classId: string | null = null
      let classSlug: string | null = null
      if (slug) {
        const rows = await sql`
          select id, slug from classes where slug = ${slug} and published = true limit 1
        `
        if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Класс не найден' })
        classId = String(rows[0].id)
        classSlug = String(rows[0].slug)
      }

      const inserted = await sql`
        insert into guide_feedback (class_id, class_slug, body)
        values (${classId}, ${classSlug}, ${text})
        returning id
      `
      if (!inserted[0]) throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить' })
      return { ok: true, id: inserted[0].id }
    }),
  )

  router.get(
    '/api/admin/feedback',
    defineEventHandler(async (event) => {
      requireAdmin(event)
      const query = getQuery(event)
      const classSlug =
        typeof query.class_slug === 'string' ? query.class_slug.trim().toLowerCase() : ''
      const items =
        classSlug && /^[a-z0-9-]+$/.test(classSlug)
          ? await sql`
              select id, class_id, class_slug, body, created_at
              from guide_feedback where class_slug = ${classSlug}
              order by created_at desc limit 200
            `
          : await sql`
              select id, class_id, class_slug, body, created_at
              from guide_feedback order by created_at desc limit 200
            `
      return {
        items: items.map((row) => ({
          id: String(row.id),
          class_id: row.class_id != null ? String(row.class_id) : null,
          class_slug: row.class_slug != null ? String(row.class_slug) : null,
          body: String(row.body),
          created_at:
            row.created_at instanceof Date
              ? row.created_at.toISOString()
              : String(row.created_at),
        })),
      }
    }),
  )

  router.delete(
    '/api/admin/feedback/:id',
    defineEventHandler(async (event) => {
      requireAdmin(event)
      const id = String(getRouterParam(event, 'id') || '').trim()
      if (!id || !UUID_RE.test(id)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
      }
      const deleted = await sql`
        delete from guide_feedback where id = ${id} returning id
      `
      if (!deleted[0]) {
        throw createError({ statusCode: 404, statusMessage: 'Сообщение не найдено' })
      }
      return { ok: true }
    }),
  )

  app.use(router)
  createServer(toNodeListener(app)).listen(PORT, '0.0.0.0', () => {
    console.log(`[svc-feedback] :${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
