export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const slug = String(getRouterParam(event, 'slug') || '')
    .trim()
    .toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный класс' })
  }

  const body = await readBody<{ tier?: unknown } | null>(event).catch(() => null)
  const raw = body?.tier

  let tier: number | null
  if (raw === null || raw === undefined || raw === '') {
    tier = null
  } else {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw createError({ statusCode: 400, statusMessage: 'Тир должен быть от 1 до 5' })
    }
    tier = n
  }

  const sql = useDb()
  const updated = await withDbError(async () => {
    const rows = await sql`
      update classes
      set tier = ${tier}
      where slug = ${slug} and published = true
      returning id, slug, tier
    `
    return rows[0] ?? null
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Класс не найден' })
  }

  return { ok: true, slug: String(updated.slug), tier: updated.tier == null ? null : Number(updated.tier) }
})
