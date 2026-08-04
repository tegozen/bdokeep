export default defineEventHandler(async (event) => {
  requireAdmin(event)
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
      class_id: String(row.class_id),
      class_slug: String(row.class_slug),
      body: String(row.body),
      created_at: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    })),
  }
})
