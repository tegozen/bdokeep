export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event)
  const password = String(body?.password || '')
  if (!password || !verifyAdminPassword(password)) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный пароль' })
  }
  setAdminSession(event)
  return { ok: true }
})
