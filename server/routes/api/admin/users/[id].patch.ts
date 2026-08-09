export default defineEventHandler(async (event) => {
  const actor = await requireSuperadmin(event)
  assertSameOrigin(event)

  const id = String(getRouterParam(event, 'id') || '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Нет id' })

  const target = await findAdminById(id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })

  const body = await readBody<{
    password?: string
    disabled?: boolean
  }>(event)

  const sql = useDb()
  const updates: string[] = []

  if (body?.password != null && String(body.password).length > 0) {
    assertStrongPassword(String(body.password))
    const hash = hashPassword(String(body.password))
    await withDbError(async () => {
      await sql`
        update admin_users
        set password_hash = ${hash}, updated_at = now()
        where id = ${id}
      `
    })
    updates.push('password')
  }

  if (typeof body?.disabled === 'boolean') {
    if (target.role === 'superadmin') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Суперадмина нельзя отключить',
      })
    }
    if (body.disabled && target.id === actor.id) {
      throw createError({ statusCode: 400, statusMessage: 'Нельзя отключить себя' })
    }
    await withDbError(async () => {
      if (body.disabled) {
        await sql`
          update admin_users
          set disabled_at = now(), updated_at = now()
          where id = ${id}
        `
      } else {
        await sql`
          update admin_users
          set disabled_at = null, updated_at = now()
          where id = ${id}
        `
      }
    })
    updates.push(body.disabled ? 'disabled' : 'enabled')
  }

  if (!updates.length) {
    throw createError({ statusCode: 400, statusMessage: 'Нечего обновлять' })
  }

  return { ok: true, updated: updates }
})
