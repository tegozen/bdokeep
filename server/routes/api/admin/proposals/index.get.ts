import { PROPOSAL_SECTIONS } from '@domain'

const PROPOSAL_STATUSES = new Set(['pending', 'approved', 'rejected', 'all'])
const SECTION_SET = new Set<string>(PROPOSAL_SECTIONS)

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const statusRaw = typeof query.status === 'string' ? query.status : 'pending'
  const status = PROPOSAL_STATUSES.has(statusRaw) ? statusRaw : 'pending'
  const classSlug =
    typeof query.class_slug === 'string' ? query.class_slug.trim().toLowerCase() : ''
  const sectionRaw = typeof query.section === 'string' ? query.section.trim() : ''
  const summary = query.summary === '1' || query.summary === 'true'
  const slugFilter = classSlug && /^[a-z0-9-]+$/.test(classSlug) ? classSlug : ''
  const sectionFilter = SECTION_SET.has(sectionRaw) ? sectionRaw : ''
  const offsetRaw = typeof query.offset === 'string' ? Number.parseInt(query.offset, 10) : 0
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0
  const pageLimit = 100

  const sql = useDb()

  if (summary) {
    const data = await withDbError(async () =>
      sql`
        select class_slug
        from guide_proposals
        where status = 'pending'
        limit 2000
      `,
    )

    const byClass: Record<string, number> = {}
    for (const row of data) {
      const slug = String(row.class_slug || '')
      if (!slug) continue
      byClass[slug] = (byClass[slug] || 0) + 1
    }
    const total = Object.values(byClass).reduce((a, b) => a + b, 0)
    return { total, byClass }
  }

  // Approved/rejected: by review time (approve order). Pending/all: by created_at.
  const byReview = status === 'approved' || status === 'rejected'

  const items = await withDbError(async () => {
    const statusClause =
      status !== 'all' ? sql`and gp.status = ${status}` : sql``
    const classClause = slugFilter
      ? sql`and gp.class_slug = ${slugFilter}`
      : sql``
    const sectionClause = sectionFilter
      ? sql`and gp.section = ${sectionFilter}`
      : sql``
    const orderClause = byReview
      ? sql`order by gp.reviewed_at desc nulls last, gp.created_at desc`
      : status === 'all'
        ? sql`order by coalesce(gp.reviewed_at, gp.created_at) desc, gp.created_at desc`
        : sql`order by gp.created_at desc`

    return sql`
      select gp.*, c.name_ru as class_name_ru
      from guide_proposals gp
      left join classes c on c.id = gp.class_id
      where true
      ${statusClause}
      ${classClause}
      ${sectionClause}
      ${orderClause}
      limit ${pageLimit + 1}
      offset ${offset}
    `
  })

  const hasMore = items.length > pageLimit
  const page = hasMore ? items.slice(0, pageLimit) : items

  return { items: page, has_more: hasMore, offset, limit: pageLimit }
})
