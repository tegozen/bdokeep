import { rewriteIconUrlsDeep } from '@/shared/lib/codexIcon'
import { readCrystalsBySlug } from '../../../../modules/crystals'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug required' })
  }
  const query = getQuery(event)
  const preset = typeof query.preset === 'string' ? query.preset : null
  const sql = useDb()
  const rows = await withDbError(() => readCrystalsBySlug(sql, slug, preset))
  return rewriteIconUrlsDeep(rows)
})
