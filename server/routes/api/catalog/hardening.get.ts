export default defineEventHandler(async () => {
  const sql = useDb()
  return withDbError(() => listItemsByType(sql, 'essence'))
})