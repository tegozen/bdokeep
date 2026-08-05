import { rewriteIconUrlsDeep } from '@/shared/lib/codexIcon'
import { readBuffsBySlug } from '../../../../modules/buffs'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })
  const preset = typeof getQuery(event).preset === 'string' ? String(getQuery(event).preset) : null
  const sql = useDb()
  return rewriteIconUrlsDeep(await withDbError(() => readBuffsBySlug(sql, slug, preset)))
})
