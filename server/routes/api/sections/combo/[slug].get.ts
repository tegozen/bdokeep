import { rewriteIconUrlsDeep } from '@/shared/lib/codexIcon'
import { readComboBySlug } from '../../../../modules/combo'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
  const mode = typeof getQuery(event).mode === 'string' ? String(getQuery(event).mode) : null
  const sql = useDb()
  return rewriteIconUrlsDeep(await withDbError(() => readComboBySlug(sql, slug, mode)))
})
