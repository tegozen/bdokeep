export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
  }

  const body = await readBody<{ payload?: { text?: unknown } } | null>(event).catch(() => null)

  const sql = useDb()
  const proposal = await withDbError(async () => {
    const rows = await sql`select * from guide_proposals where id = ${id} limit 1`
    return rows[0] ?? null
  })

  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })

  const section = String(proposal.section)
  let payload = (proposal.payload || {}) as Record<string, unknown>
  let reviewNote: string | null = null

  if (section === 'summary' && body?.payload && 'text' in body.payload) {
    const text = String(body.payload.text ?? '').trim()
    if (!text) {
      throw createError({ statusCode: 400, statusMessage: 'Пустой текст' })
    }
    if (text.length > MAX_TEXT_LEN) {
      throw createError({
        statusCode: 400,
        statusMessage: `Текст длиннее ${MAX_TEXT_LEN} символов`,
      })
    }
    const original = String(payload.text || '').trim()
    payload = { text }
    if (text !== original) {
      reviewNote = 'отредактировано перед одобрением'
    }
  }

  await applyProposal(
    {
      id: String(proposal.id),
      class_id: String(proposal.class_id),
      section,
      payload,
      status: String(proposal.status),
    },
    { reviewNote },
  )

  return { ok: true }
})
