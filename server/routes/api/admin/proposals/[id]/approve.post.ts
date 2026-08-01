export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
  }

  const sql = useDb()
  const proposal = await withDbError(async () => {
    const rows = await sql`select * from guide_proposals where id = ${id} limit 1`
    return rows[0] ?? null
  })

  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })

  await applyProposal({
    id: String(proposal.id),
    class_id: String(proposal.class_id),
    section: String(proposal.section),
    payload: (proposal.payload || {}) as Record<string, unknown>,
    status: String(proposal.status),
  })

  return { ok: true }
})
