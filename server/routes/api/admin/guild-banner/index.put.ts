type Body = {
  enabled?: unknown
  body?: unknown
  links?: unknown
  icon_base64?: unknown
  icon_mime?: unknown
  clear_icon?: unknown
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const input = (await readBody(event)) as Body
  const enabled = Boolean(input.enabled)
  const body = parseGuildBannerBody(input.body)
  const links = parseGuildBannerLinks(input.links)
  const icon = parseGuildBannerIcon(input)

  const sql = useDb()
  const updated = await withDbError(async () => {
    if (icon.clear) {
      return sql`
        update guild_recruit_banner
        set
          enabled = ${enabled},
          body = ${body},
          links = ${sql.json(links)},
          icon_mime = null,
          icon_bytes = null,
          updated_at = now()
        where id = true
        returning enabled, body, icon_bytes is not null as has_icon, links, updated_at
      `
    }
    if (icon.bytes && icon.mime) {
      return sql`
        update guild_recruit_banner
        set
          enabled = ${enabled},
          body = ${body},
          links = ${sql.json(links)},
          icon_mime = ${icon.mime},
          icon_bytes = ${icon.bytes},
          updated_at = now()
        where id = true
        returning enabled, body, icon_bytes is not null as has_icon, links, updated_at
      `
    }
    return sql`
      update guild_recruit_banner
      set
        enabled = ${enabled},
        body = ${body},
        links = ${sql.json(links)},
        updated_at = now()
      where id = true
      returning enabled, body, icon_bytes is not null as has_icon, links, updated_at
    `
  })

  const row = updated[0]
  if (!row) {
    throw createError({ statusCode: 500, statusMessage: 'Не удалось сохранить' })
  }

  return {
    ok: true as const,
    enabled: Boolean(row.enabled),
    body: String(row.body ?? ''),
    has_icon: Boolean(row.has_icon),
    links: normalizeGuildBannerLinksFromDb(row.links),
    updated_at: isoTs(row.updated_at),
  }
})
