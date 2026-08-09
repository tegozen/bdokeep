import { UUID_RE, type ProposalSection } from '@domain'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
  if (String(proposal.status) !== 'approved') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Повторно применить можно только одобренное',
    })
  }

  await applyProposal(
    {
      id: String(proposal.id),
      class_id: String(proposal.class_id),
      class_slug: proposal.class_slug == null ? undefined : String(proposal.class_slug),
      section: String(proposal.section) as ProposalSection,
      payload: (proposal.payload || {}) as Record<string, unknown>,
      status: String(proposal.status),
      author_label: proposal.author_label == null ? null : String(proposal.author_label),
    },
    { reapply: true, reviewNote: 'повторно применено' },
  )

  return { ok: true }
})
