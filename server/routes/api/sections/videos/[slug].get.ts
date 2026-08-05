import { rewriteIconUrlsDeep } from '@/shared/lib/codexIcon'
import { readVideosBySlug } from '../../../../modules/videos'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
  const mode = typeof getQuery(event).mode === 'string' ? String(getQuery(event).mode) : null
  const sql = useDb()
  return rewriteIconUrlsDeep(await withDbError(() => readVideosBySlug(sql, slug, mode)))
})
