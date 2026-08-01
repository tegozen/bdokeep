import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'bdo_admin'
const MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days

const WEAK_ADMIN_PASSWORDS = new Set(['changeme', 'password', 'admin', '123456'])

function adminSecret(): string {
  const config = useRuntimeConfig()
  // Prefer plain ADMIN_PASSWORD (compose / .env); NUXT_* only if someone set it
  const password = String(
    config.adminPassword || process.env.ADMIN_PASSWORD || process.env.NUXT_ADMIN_PASSWORD || '',
  )
  if (!password) {
    throw createError({ statusCode: 500, statusMessage: 'ADMIN_PASSWORD не задан' })
  }
  // Fail closed in production: refuse well-known defaults
  if (process.env.NODE_ENV === 'production' && WEAK_ADMIN_PASSWORDS.has(password.toLowerCase())) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ADMIN_PASSWORD слишком слабый для production',
    })
  }
  return password
}

function sign(payload: string): string {
  return createHmac('sha256', adminSecret()).update(payload).digest('base64url')
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

export function verifyAdminPassword(password: string): boolean {
  const expected = adminSecret()
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
