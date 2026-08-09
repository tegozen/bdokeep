export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)

  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = normalizeUsername(String(body?.username || ''))
  const password = String(body?.password || '')

  assertValidUsername(username)
  assertStrongPassword(password)

  const existing = await findAdminByUsername(username)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Такой логин уже есть' })
  }

  const sql = useDb()
  const rows = await withDbError(async () => {
    return await sql`
      insert into admin_users (username, password_hash, role)
      values (${username}, ${hashPassword(password)}, 'admin')
      returning id, username, role, created_at
    `
  })
  const row = rows[0]
  if (!row) throw createError({ statusCode: 502, statusMessage: 'Не удалось создать' })

  return {
    ok: true,
    user: {
      id: String(row.id),
      username: String(row.username),
      role: 'admin' as const,
      created_at: String(row.created_at),
    },
  }
})
