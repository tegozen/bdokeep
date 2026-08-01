export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = (await readBody(event).catch(() => ({}))) as CatalogResolveBody
  const sql = useDb()
  return withDbError(() => resolveCatalog(sql, body || {}))
})
