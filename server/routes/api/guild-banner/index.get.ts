export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate')

  const sql = useDb()
  const row = await withDbError(async () => {
    const rows = await sql`
      select enabled, body, icon_bytes is not null as has_icon, links, updated_at
      from guild_recruit_banner
      where id = true
      limit 1
    `
    return rows[0] ?? null
  })

  if (!row || !row.enabled) {
    return { enabled: false as const }
  }

  return {
    enabled: true as const,
    body: String(row.body ?? ''),
    has_icon: Boolean(row.has_icon),
    links: normalizeGuildBannerLinksFromDb(row.links),
    updated_at: isoTs(row.updated_at),
  }
})
