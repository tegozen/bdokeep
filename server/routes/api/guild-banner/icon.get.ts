export default defineEventHandler(async (event) => {
  const sql = useDb()
  const row = await withDbError(async () => {
    const rows = await sql`
      select icon_mime, icon_bytes, updated_at
      from guild_recruit_banner
      where id = true
      limit 1
    `
    return rows[0] ?? null
  })

  if (!row?.icon_bytes || !row.icon_mime) {
    throw createError({ statusCode: 404, statusMessage: 'Иконка не найдена' })
  }

  const bytes = Buffer.isBuffer(row.icon_bytes)
    ? row.icon_bytes
    : Buffer.from(row.icon_bytes as Uint8Array)

  setHeader(event, 'Content-Type', String(row.icon_mime))
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  if (row.updated_at) {
    setHeader(event, 'Last-Modified', isoTs(row.updated_at))
  }
  return bytes
})
