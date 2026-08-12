const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_HITS = 5
const FAIL_DELAY_MS = 400

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const ip = clientIp(event)
  const limit = await checkRateLimit(`login:${ip}`, LOGIN_MAX_HITS, LOGIN_WINDOW_MS)
  if (!limit.allowed) {
    const wait = formatRetryAfterRu(limit.retryAfterMs)
    throw createError({
      statusCode: 429,
      statusMessage: `Слишком много попыток входа. Подождите ${wait}.`,
    })
  }

  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = String(body?.username || '')
  const password = String(body?.password || '')

  const usernameKey = normalizeUsername(username)
  if (usernameKey) {
    const userLimit = await checkRateLimit(`login-user:${usernameKey}`, LOGIN_MAX_HITS, LOGIN_WINDOW_MS)
    if (!userLimit.allowed) {
      const wait = formatRetryAfterRu(userLimit.retryAfterMs)
      throw createError({
        statusCode: 429,
        statusMessage: `Слишком много попыток входа. Подождите ${wait}.`,
      })
    }
  }

  const user = await authenticateAdmin(username, password)
  if (!user) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS))
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  await setAdminSession(event, user)
  return { ok: true, username: user.username, role: user.role }
})
