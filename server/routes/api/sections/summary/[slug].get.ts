import { readSummaryBySlug } from '../../../../modules/summary'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
  const sql = useDb()
  return withDbError(() => readSummaryBySlug(sql, slug))
})
