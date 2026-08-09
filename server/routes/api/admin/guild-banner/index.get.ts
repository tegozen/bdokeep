export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

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

  if (!row) {
    return {
      enabled: false,
      body: '',
      has_icon: false,
      links: [] as { label: string; url: string }[],
      updated_at: null as string | null,
    }
  }

  return {
    enabled: Boolean(row.enabled),
    body: String(row.body ?? ''),
    has_icon: Boolean(row.has_icon),
    links: normalizeGuildBannerLinksFromDb(row.links),
    updated_at: isoTs(row.updated_at),
  }
})
