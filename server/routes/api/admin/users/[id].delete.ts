export default defineEventHandler(async (event) => {
  const actor = await requireSuperadmin(event)
  assertSameOrigin(event)

  const id = String(getRouterParam(event, 'id') || '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Нет id' })

  const target = await findAdminById(id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })

  if (target.role === 'superadmin') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Суперадмина нельзя удалить',
    })
  }

  if (target.id === actor.id) {
    throw createError({ statusCode: 400, statusMessage: 'Нельзя удалить себя' })
  }

  const sql = useDb()
  await withDbError(async () => {
    await sql`delete from admin_users where id = ${id}`
  })

  return { ok: true }
})
