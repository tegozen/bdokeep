const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_HITS = 5
const FAIL_DELAY_MS = 400

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)
  if (!checkRateLimit(`login:${ip}`, LOGIN_MAX_HITS, LOGIN_WINDOW_MS)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Слишком много попыток входа. Подождите.',
    })
  }

  const body = await readBody<{ password?: string }>(event)
  const password = String(body?.password || '')
  if (!password || !verifyAdminPassword(password)) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS))
    throw createError({ statusCode: 401, statusMessage: 'Неверный пароль' })
  }
  setAdminSession(event)
  return { ok: true }
})
