import {
  MAX_AUTHOR_LEN,
  PROPOSAL_SECTIONS,
  type ProposalSection,
} from '@domain'

type Body = {
  class_slug?: string
  section?: string
  payload?: Record<string, unknown>
  author_label?: string | null
  website?: string // honeypot
}

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const body = (await readBody(event)) as Body
  const asSuperadmin = isAdminSession(event)

  if (body.website) {
    return { ok: true }
  }

  const ip = clientIp(event)
  if (!asSuperadmin) {
    const limit = checkRateLimit(`proposal:${ip}`)
    if (!limit.allowed) {
      const wait = formatRetryAfterRu(limit.retryAfterMs)
      throw createError({
        statusCode: 429,
        statusMessage: `Слишком много предложений. Подождите ${wait}.`,
      })
    }
  }

  const slug = String(body.class_slug || '')
    .trim()
    .toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный класс' })
  }

  const section = body.section as ProposalSection
  if (!PROPOSAL_SECTIONS.includes(section)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный раздел' })
  }

  const sql = useDb()

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

  const { payload } = await withDbError(() =>
    parseAndValidatePayload({
      sql,
      classSlug: slug,
      section,
      rawPayload: body.payload,
    }),
  )

  let authorLabel: string | null = null
  if (body.author_label != null && String(body.author_label).trim()) {
    authorLabel = String(body.author_label).trim().slice(0, MAX_AUTHOR_LEN)
  }
  if (!asSuperadmin) {
    if (!authorLabel) {
      throw createError({ statusCode: 400, statusMessage: 'Укажите игровой ник' })
    }
  } else if (!authorLabel) {
    authorLabel = 'superadmin'
  }

  const inserted = await withDbError(async () => {
    const rows = await sql`
      insert into guide_proposals (class_id, class_slug, section, payload, author_label, status)
      values (
        ${klass.id},
        ${klass.slug},
        ${section},
        ${sql.json(payload)},
        ${authorLabel},
        'pending'
      )
      returning id, class_id, class_slug, section, payload, status, author_label
    `
    return rows[0]!
  })

  if (asSuperadmin) {
    await applyPendingOrReject(
      {
        id: String(inserted.id),
        class_id: String(inserted.class_id),
        class_slug: String(inserted.class_slug),
        section: String(inserted.section),
        payload: (inserted.payload || {}) as Record<string, unknown>,
        status: String(inserted.status),
        author_label: inserted.author_label == null ? null : String(inserted.author_label),
      },
      { reviewNote: 'auto-approved (superadmin)' },
    )
    return { ok: true, id: inserted.id, autoApproved: true }
  }

  return { ok: true, id: inserted.id, autoApproved: false }
})
