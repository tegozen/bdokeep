import { rewriteIconUrlsDeep } from '@/shared/lib/codexIcon'
import { readRelicsBySlug } from '../../../../modules/relics'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
  const preset = typeof getQuery(event).preset === 'string' ? String(getQuery(event).preset) : null
  const sql = useDb()
  const data = await withDbError(() => readRelicsBySlug(sql, slug, preset))
  return rewriteIconUrlsDeep(data)
})
