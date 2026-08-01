export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
  }

  const body = await readBody<{ note?: string }>(event).catch(() => ({} as { note?: string }))
  const sql = useDb()

  const proposal = await withDbError(async () => {
    const rows = await sql`
      select id, status from guide_proposals where id = ${id} limit 1
    `
    return rows[0] ?? null
  })

  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })
  if (proposal.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
  }

  const note =
    body?.note != null && String(body.note).trim()
      ? String(body.note).trim().slice(0, 500)
      : null

  await withDbError(async () => {
    const updated = await sql`
      update guide_proposals
      set
        status = 'rejected',
        reviewed_at = now(),
        review_note = ${note}
      where id = ${id} and status = 'pending'
      returning id
    `
    if (!updated.length) {
      throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
    }
  })

  return { ok: true }
})
