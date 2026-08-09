export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'pending'
  const classSlug =
    typeof query.class_slug === 'string' ? query.class_slug.trim().toLowerCase() : ''
  const summary = query.summary === '1' || query.summary === 'true'

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
    if (status && status !== 'all' && classSlug && /^[a-z0-9-]+$/.test(classSlug)) {
      if (byReview) {
        return sql`
          select gp.*, c.name_ru as class_name_ru
          from guide_proposals gp
          left join classes c on c.id = gp.class_id
          where gp.status = ${status} and gp.class_slug = ${classSlug}
          order by gp.reviewed_at desc nulls last, gp.created_at desc
          limit 100
        `
      }
      return sql`
        select gp.*, c.name_ru as class_name_ru
        from guide_proposals gp
        left join classes c on c.id = gp.class_id
        where gp.status = ${status} and gp.class_slug = ${classSlug}
        order by gp.created_at desc
        limit 100
      `
    }
    if (status && status !== 'all') {
      if (byReview) {
        return sql`
          select gp.*, c.name_ru as class_name_ru
          from guide_proposals gp
          left join classes c on c.id = gp.class_id
          where gp.status = ${status}
          order by gp.reviewed_at desc nulls last, gp.created_at desc
          limit 100
        `
      }
      return sql`
        select gp.*, c.name_ru as class_name_ru
        from guide_proposals gp
        left join classes c on c.id = gp.class_id
        where gp.status = ${status}
        order by gp.created_at desc
        limit 100
      `
    }
    if (classSlug && /^[a-z0-9-]+$/.test(classSlug)) {
      return sql`
        select gp.*, c.name_ru as class_name_ru
        from guide_proposals gp
        left join classes c on c.id = gp.class_id
        where gp.class_slug = ${classSlug}
        order by coalesce(gp.reviewed_at, gp.created_at) desc, gp.created_at desc
        limit 100
      `
    }
    return sql`
      select gp.*, c.name_ru as class_name_ru
      from guide_proposals gp
      left join classes c on c.id = gp.class_id
      order by coalesce(gp.reviewed_at, gp.created_at) desc, gp.created_at desc
      limit 100
    `
  })

  return { items }
})
