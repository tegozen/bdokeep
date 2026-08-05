import { rewriteIconUrlsDeep } from '@/shared/lib/codexIcon'
import { readMorphsBySlug } from '../../../../modules/morphs'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
  const preset = typeof getQuery(event).preset === 'string' ? String(getQuery(event).preset) : null
  const sql = useDb()
  return rewriteIconUrlsDeep(await withDbError(() => readMorphsBySlug(sql, slug, preset)))
})
