export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
  }

  const body = await readBody<{ note?: string }>(event).catch(() => ({} as { note?: string }))
  const rest = getServiceRest()

  const { data: proposal, error } = await rest
    .from('guide_proposals')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })
  if (proposal.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Уже рассмотрено' })
  }

  const note =
    body?.note != null && String(body.note).trim()
      ? String(body.note).trim().slice(0, 500)
      : null

  const { error: updErr } = await rest
    .from('guide_proposals')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq('id', id)

  if (updErr) throw createError({ statusCode: 502, statusMessage: updErr.message })

  return { ok: true }
})
