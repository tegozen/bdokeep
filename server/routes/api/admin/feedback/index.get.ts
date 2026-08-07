export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const classSlug =
    typeof query.class_slug === 'string' ? query.class_slug.trim().toLowerCase() : ''

  const sql = useDb()

  const items = await withDbError(async () => {
    if (classSlug && /^[a-z0-9-]+$/.test(classSlug)) {
      return sql`
        select id, class_id, class_slug, body, created_at
        from guide_feedback
        where class_slug = ${classSlug}
        order by created_at desc
        limit 200
      `
    }
    return sql`
      select id, class_id, class_slug, body, created_at
      from guide_feedback
      order by created_at desc
      limit 200
    `
  })

  return {
    items: items.map((row) => ({
      id: String(row.id),
      class_id: row.class_id != null ? String(row.class_id) : null,
      class_slug: row.class_slug != null ? String(row.class_slug) : null,
      body: String(row.body),
      created_at: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    })),
  }
})
