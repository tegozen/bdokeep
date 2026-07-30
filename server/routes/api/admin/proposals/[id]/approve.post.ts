export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
  }

  const rest = getServiceRest()
  const { data: proposal, error } = await rest
    .from('guide_proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })

  await applyProposal(proposal)

  return { ok: true }
})
