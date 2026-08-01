export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
    .trim()
    .toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный класс' })
  }

  const sql = useDb()
  const bundle = await withDbError(() => fetchGuideBundleBySlug(sql, slug))
  if (!bundle) {
    throw createError({ statusCode: 404, statusMessage: 'Не найдено' })
  }
  return bundle
})
