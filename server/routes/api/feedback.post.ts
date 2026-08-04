const MAX_BODY_LEN = 2000

type Body = {
  body?: string
  classSlug?: string
  website?: string // honeypot
}

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const body = (await readBody(event)) as Body

  if (body.website) {
    return { ok: true }
  }

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
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Введите сообщение' })
  }
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

  const sql = useDb()

  let classId: string | null = null
  let classSlug: string | null = null

  if (slug) {
    const klass = await withDbError(async () => {
      const rows = await sql`
        select id, slug, published
        from classes
        where slug = ${slug} and published = true
        limit 1
      `
      return rows[0] ?? null
    })

    if (!klass) throw createError({ statusCode: 404, statusMessage: 'Класс не найден' })
    classId = String(klass.id)
    classSlug = String(klass.slug)
  }

  const inserted = await withDbError(async () => {
    const rows = await sql`
      insert into guide_feedback (class_id, class_slug, body)
      values (${classId}, ${classSlug}, ${text})
      returning id
    `
    return rows[0] ?? null
  })

  if (!inserted) {
    throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить' })
  }

  return { ok: true, id: inserted.id }
})
