import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'bdo_admin'
const MAX_AGE_SEC = 60 * 60 * 24 // 1 day

const WEAK_ADMIN_PASSWORDS = new Set(['changeme', 'password', 'admin', '123456'])

/** Login password only — never used as HMAC key. */
function adminPassword(): string {
  const config = useRuntimeConfig()
  const password = String(
    config.adminPassword || process.env.ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || '',
  )
  if (!password) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD не задан' })
  }
  if (process.env.NODE_ENV === 'production' && WEAK_ADMIN_PASSWORDS.has(password.toLowerCase())) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ADMIN_PASSWORD слишком слабый для production',
    })
  }
  return password
}

/** Dedicated cookie signing secret (not the login password). */
function sessionSecret(): string {
  const config = useRuntimeConfig()
  const secret = String(
    config.adminSessionSecret ||
      process.env.ADMIN_SESSION_SECRET ||
      process.env.NUXT_ADMIN_SESSION_SECRET ||
      '',
  ).trim()
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_SESSION_SECRET не задан' })
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ADMIN_SESSION_SECRET слишком короткий (минимум 32 символа)',
    })
  }
  if (secret === adminPassword()) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ADMIN_SESSION_SECRET должен отличаться от ADMIN_PASSWORD',
    })
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

function buildToken(exp: number): string {
  const payload = `admin.${exp}`
  return `${payload}.${sign(payload)}`
}

function parseToken(token: string): { ok: boolean; exp?: number } {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false }
  const [role, expStr, sig] = parts
  if (role !== 'admin') return { ok: false }
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return { ok: false }
  const payload = `${role}.${expStr}`
  const expected = sign(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false }
  } catch {
    return { ok: false }
  }
  return { ok: true, exp }
}

export function setAdminSession(event: Parameters<typeof setCookie>[0]) {
  const exp = Date.now() + MAX_AGE_SEC * 1000
  setCookie(event, COOKIE_NAME, buildToken(exp), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SEC,
  })
}

export function clearAdminSession(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function requireAdmin(event: Parameters<typeof getCookie>[0]) {
  assertSameOrigin(event)
  const token = getCookie(event, COOKIE_NAME)
  if (!token || !parseToken(token).ok) {
    throw createError({ statusCode: 401, statusMessage: 'Нет доступа' })
  }
}

export function isAdminSession(event: Parameters<typeof getCookie>[0]): boolean {
  const token = getCookie(event, COOKIE_NAME)
  return Boolean(token && parseToken(token).ok)
}

/**
 * Constant-time password check via scrypt digests (fixed 32-byte compare).
 * Avoids length short-circuit on the plaintext password.
 */
export function verifyAdminPassword(password: string): boolean {
  const expected = adminPassword()
  const salt = createHmac('sha256', sessionSecret()).update('admin-password-salt').digest()
  const a = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 })
  const b = scryptSync(expected, salt, 32, { N: 16384, r: 8, p: 1 })
  return timingSafeEqual(a, b)
}
