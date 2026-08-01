export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'pending'
  const classSlug =
    typeof query.class_slug === 'string' ? query.class_slug.trim().toLowerCase() : ''
  const summary = query.summary === '1' || query.summary === 'true'

  const rest = getServiceRest()

  if (summary) {
    const { data, error } = await rest
      .from('guide_proposals')
      .select('class_slug')
      .eq('status', 'pending')
      .limit(2000)

    if (error) throw createError({ statusCode: 502, statusMessage: error.message })

    const byClass: Record<string, number> = {}
    for (const row of data ?? []) {
      const slug = String((row as { class_slug?: string }).class_slug || '')
      if (!slug) continue
      byClass[slug] = (byClass[slug] || 0) + 1
    }
    const total = Object.values(byClass).reduce((a, b) => a + b, 0)
    return { total, byClass }
  }

  let req = rest
    .from('guide_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    req = req.eq('status', status)
  }
  if (classSlug && /^[a-z0-9-]+$/.test(classSlug)) {
    req = req.eq('class_slug', classSlug)
  }

  const { data, error } = await req
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  return { items: data ?? [] }
})
