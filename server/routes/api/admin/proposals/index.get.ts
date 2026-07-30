export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'pending'

  const rest = getServiceRest()
  let req = rest
    .from('guide_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    req = req.eq('status', status)
  }

  const { data, error } = await req
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  return { items: data ?? [] }
})
