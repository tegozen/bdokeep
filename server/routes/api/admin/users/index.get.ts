export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const sql = useDb()
  const rows = await withDbError(async () => {
    return await sql`
      select id, username, role, disabled_at, created_at, updated_at
      from admin_users
      order by role desc, username asc
    `
  })
  return {
    items: rows.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      role: String(r.role) as 'superadmin' | 'admin',
      disabled: r.disabled_at != null,
      disabled_at: r.disabled_at == null ? null : new Date(String(r.disabled_at)).toISOString(),
      created_at: new Date(String(r.created_at)).toISOString(),
      updated_at: new Date(String(r.updated_at)).toISOString(),
    })),
  }
})
