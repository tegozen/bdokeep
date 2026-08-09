import { UUID_RE } from '@domain'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })
  }

  const sql = useDb()

  const deleted = await withDbError(async () => {
    const rows = await sql`
      delete from guide_feedback
      where id = ${id}
      returning id
    `
    return rows[0] ?? null
  })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Сообщение не найдено' })
  }

  return { ok: true }
})
