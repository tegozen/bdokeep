import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { H3Event } from 'h3'

export type AdminRole = 'superadmin' | 'admin'

export type AdminUser = {
  id: string
  username: string
  role: AdminRole
}

export type AdminSession = AdminUser & {
  expiresAt: number
}

const BOOTSTRAP_USERNAME = 'admin'

const COOKIE_NAME = 'bdo_admin'
const MAX_AGE_SEC = 60 * 60 * 24 // 1 day
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 32
const WEAK_ADMIN_PASSWORDS = new Set(['changeme', 'password', 'admin', '123456'])

let bootstrapPromise: Promise<void> | null = null

/** Bootstrap password only — never used as JWT key. */
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

/** JWT signing secret (not the login password). */
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

function jwtKey(): Uint8Array {
  return new TextEncoder().encode(sessionSecret())
}

export function assertStrongPassword(password: string) {
  if (!password || password.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Пароль слишком короткий (минимум 10)' })
  }
  if (process.env.NODE_ENV === 'production' && WEAK_ADMIN_PASSWORDS.has(password.toLowerCase())) {
    throw createError({ statusCode: 400, statusMessage: 'Пароль слишком слабый' })
  }
}

export function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
}

export function assertValidUsername(username: string) {
  if (username.length < 2 || username.length > 64) {
    throw createError({ statusCode: 400, statusMessage: 'Логин: 2–64 символа' })
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Логин: только латиница, цифры, . _ -',
    })
  }
}

/** Format: scrypt$N$r$p$saltB64$urlHashB64 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = String(stored || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  if (![N, r, p].every((n) => Number.isFinite(n) && n > 0)) return false
  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(parts[4], 'base64url')
    expected = Buffer.from(parts[5], 'base64url')
  } catch {
    return false
  }
  if (!salt.length || expected.length !== SCRYPT_KEYLEN) return false
  try {
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN, { N, r, p })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

type AdminRow = {
  id: string
  username: string
  password_hash: string
  role: string
  disabled_at: string | null
}

function rowToUser(row: AdminRow): AdminUser | null {
  if (row.role !== 'superadmin' && row.role !== 'admin') return null
  return { id: String(row.id), username: String(row.username), role: row.role }
}

export async function findAdminByUsername(username: string): Promise<AdminRow | null> {
  const sql = useDb()
  const rows = await withDbError(async () => {
    return await sql<AdminRow[]>`
      select id, username, password_hash, role, disabled_at
      from admin_users
      where lower(username) = ${username}
      limit 1
    `
  })
  return rows[0] ?? null
}

export async function findAdminById(id: string): Promise<AdminRow | null> {
  const sql = useDb()
  const rows = await withDbError(async () => {
    return await sql<AdminRow[]>`
      select id, username, password_hash, role, disabled_at
      from admin_users
      where id = ${id}
      limit 1
    `
  })
  return rows[0] ?? null
}

/**
 * Create bootstrap superadmin (`admin` + ADMIN_PASSWORD) if missing.
 * Never overwrites an existing password.
 */
export async function ensureBootstrapSuperadmin(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const username = BOOTSTRAP_USERNAME
      assertValidUsername(username)
      const existing = await findAdminByUsername(username)
      if (existing) return
      const password = adminPassword()
      assertStrongPassword(password)
      const sql = useDb()
      try {
        await withDbError(async () => {
          await sql`
            insert into admin_users (username, password_hash, role)
            values (${username}, ${hashPassword(password)}, 'superadmin')
          `
        })
        console.info(`[adminAuth] bootstrap superadmin created: ${username}`)
      } catch (err) {
        // Race with another worker / unique index
        const again = await findAdminByUsername(username)
        if (!again) throw err
      }
    })().catch((err) => {
      bootstrapPromise = null
      throw err
    })
  }
  await bootstrapPromise
}

type JwtClaims = JWTPayload & {
  sub: string
  username: string
  role: AdminRole
  /** Trailing slice of password_hash — invalidates JWT after password change. */
  pf?: string
}

type VerifiedJwt = AdminSession & { pf: string }

/** Fingerprint of password hash embedded in JWT (no migration needed). */
function passwordFp(passwordHash: string): string {
  return String(passwordHash || '').slice(-16)
}

async function signJwt(user: AdminUser, expSec: number, passwordHash: string): Promise<string> {
  return await new SignJWT({
    username: user.username,
    role: user.role,
    pf: passwordFp(passwordHash),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expSec)
    .sign(jwtKey())
}

async function verifyJwt(token: string): Promise<VerifiedJwt | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ['HS256'] })
    const sub = String(payload.sub || '')
    const username = String((payload as JwtClaims).username || '')
    const role = (payload as JwtClaims).role
    const pf = String((payload as JwtClaims).pf || '')
    const exp = payload.exp
    if (!sub || !username || !pf || (role !== 'superadmin' && role !== 'admin')) return null
    if (exp == null || exp * 1000 < Date.now()) return null
    return { id: sub, username, role, expiresAt: exp * 1000, pf }
  } catch {
    return null
  }
}

function cookieSecure(event: H3Event): boolean {
  // Only trust X-Forwarded-Proto behind a configured reverse proxy (same gate as clientIp).
  if (trustProxyEnabled()) {
    const forwarded = getHeader(event, 'x-forwarded-proto')
    if (forwarded) {
      return forwarded.split(',')[0]!.trim().toLowerCase() === 'https'
    }
  }
  return getRequestURL(event).protocol === 'https:'
}

function cookieBase(event: H3Event) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(event),
    path: '/',
  }
}

export async function setAdminSession(event: H3Event, user: AdminUser) {
  const row = await findAdminById(user.id)
  if (!row || row.disabled_at) {
    throw createError({ statusCode: 401, statusMessage: 'Нет доступа' })
  }
  const expSec = Math.floor(Date.now() / 1000) + MAX_AGE_SEC
  const token = await signJwt(user, expSec, row.password_hash)
  setCookie(event, COOKIE_NAME, token, {
    ...cookieBase(event),
    maxAge: MAX_AGE_SEC,
  })
}

export function clearAdminSession(event: H3Event) {
  // Must match setCookie attributes or browsers keep the Secure cookie after logout.
  deleteCookie(event, COOKIE_NAME, cookieBase(event))
}

async function readSession(event: H3Event): Promise<AdminSession | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  return verifyJwt(token)
}

function sessionMatchesRow(session: VerifiedJwt, row: AdminRow): boolean {
  if (row.disabled_at) return false
  if (row.role !== 'superadmin' && row.role !== 'admin') return false
  if (row.role !== session.role || row.username !== session.username) return false
  if (session.pf !== passwordFp(row.password_hash)) return false
  return true
}

/** Soft check (no CSRF). Returns session if cookie JWT is valid and user active. */
export async function getAdminSession(event: H3Event): Promise<AdminSession | null> {
  const session = await readSession(event)
  if (!session) return null
  const row = await findAdminById(session.id)
  if (!row || !sessionMatchesRow(session, row)) return null
  return {
    id: String(row.id),
    username: String(row.username),
    role: row.role as AdminRole,
    expiresAt: session.expiresAt,
  }
}

export async function requireStaff(event: H3Event): Promise<AdminSession> {
  assertSameOrigin(event)
  const session = await readSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Нет доступа' })
  }
  const row = await findAdminById(session.id)
  if (!row || !sessionMatchesRow(session, row)) {
    throw createError({ statusCode: 401, statusMessage: 'Нет доступа' })
  }
  return {
    id: session.id,
    username: row.username,
    role: row.role as AdminRole,
    expiresAt: session.expiresAt,
  }
}

export async function requireSuperadmin(event: H3Event): Promise<AdminSession> {
  const session = await requireStaff(event)
  if (session.role !== 'superadmin') {
    throw createError({ statusCode: 403, statusMessage: 'Только суперадмин' })
  }
  return session
}

/** Alias: staff gate (admin | superadmin). */
export async function requireAdmin(event: H3Event): Promise<AdminSession> {
  return requireStaff(event)
}

/** Session meta for clients. No token leaked. Re-checks disabled in DB. */
export async function getAdminSessionMeta(
  event: H3Event,
): Promise<{ ok: false } | { ok: true; expiresAt: number; username: string; role: AdminRole }> {
  const session = await getAdminSession(event)
  if (!session) return { ok: false }
  return {
    ok: true,
    expiresAt: session.expiresAt,
    username: session.username,
    role: session.role,
  }
}

export async function authenticateAdmin(
  usernameRaw: string,
  password: string,
): Promise<AdminUser | null> {
  await ensureBootstrapSuperadmin()
  const username = normalizeUsername(usernameRaw)
  if (!username || !password) return null
  const row = await findAdminByUsername(username)
  if (!row || row.disabled_at) {
    // Dummy scrypt work against timing on missing/disabled users.
    const dummy =
      'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    verifyPassword(password || 'x', dummy)
    return null
  }
  if (!verifyPassword(password, row.password_hash)) return null
  return rowToUser(row)
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME }
