import { useConfirm } from '@/shared/lib/useConfirm'
import { clearAdminOfflineCaches } from './clearAdminOfflineCaches'

export type AdminRole = 'superadmin' | 'admin'

type AdminMeResponse =
  | { ok: false }
  | { ok: true; expiresAt: number; username: string; role: AdminRole }

const SESSION_EXPIRES_KEY = 'admin-session-expires-at'
const SESSION_ROLE_KEY = 'admin-session-role'
const SESSION_USER_KEY = 'admin-session-username'
/** Survives hard reload so offline admin UI can hydrate while cookie still valid. */
const SESSION_STORAGE_KEY = 'bdo_admin_expires_at'
const SESSION_STORAGE_META_KEY = 'bdo_admin_meta'

let visibilityHooked = false
let expiryTimer: ReturnType<typeof setTimeout> | null = null

function clearExpiryTimer() {
  if (expiryTimer != null) {
    clearTimeout(expiryTimer)
    expiryTimer = null
  }
}

function readStoredExpiry(): number | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const at = Number(raw)
    if (!Number.isFinite(at) || at <= Date.now()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      sessionStorage.removeItem(SESSION_STORAGE_META_KEY)
      return null
    }
    return at
  } catch {
    return null
  }
}

function readStoredMeta(): { username: string; role: AdminRole } | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { username?: string; role?: string }
    if (!parsed.username || (parsed.role !== 'superadmin' && parsed.role !== 'admin')) return null
    return { username: parsed.username, role: parsed.role }
  } catch {
    return null
  }
}

function writeStoredExpiry(at: number | null, meta?: { username: string; role: AdminRole } | null) {
  if (!import.meta.client) return
  try {
    if (at == null) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      sessionStorage.removeItem(SESSION_STORAGE_META_KEY)
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, String(at))
      if (meta) sessionStorage.setItem(SESSION_STORAGE_META_KEY, JSON.stringify(meta))
    }
  } catch {
    /* private mode */
  }
}

/**
 * Staff session (admin | superadmin) + offline admin-cache purge on logout / expiry / 401.
 * `isSuperadmin` is true only for role=superadmin (user management).
 * `isStaff` / legacy `isSuperadmin`-for-moderation: use `isStaff` for gates that any admin may use.
 */
export function useSuperadmin() {
  const isStaff = useState('admin-staff', () => false)
  const isSuperadmin = useState('admin-superadmin', () => false)
  const username = useState<string | null>(SESSION_USER_KEY, () => null)
  const role = useState<AdminRole | null>(SESSION_ROLE_KEY, () => null)
  const expiresAt = useState<number | null>(SESSION_EXPIRES_KEY, () => null)
  const { confirm } = useConfirm()

  function applySession(meta: { username: string; role: AdminRole; expiresAt: number }) {
    isStaff.value = true
    isSuperadmin.value = meta.role === 'superadmin'
    username.value = meta.username
    role.value = meta.role
    scheduleExpiryPurge(meta.expiresAt, { username: meta.username, role: meta.role })
  }

  async function loseSession() {
    const hadSession =
      isStaff.value || expiresAt.value != null || readStoredExpiry() != null
    clearExpiryTimer()
    expiresAt.value = null
    writeStoredExpiry(null)
    isStaff.value = false
    isSuperadmin.value = false
    username.value = null
    role.value = null
    if (hadSession) await clearAdminOfflineCaches()
  }

  function scheduleExpiryPurge(at: number, meta: { username: string; role: AdminRole }) {
    clearExpiryTimer()
    expiresAt.value = at
    writeStoredExpiry(at, meta)
    if (!import.meta.client) return
    const delay = Math.max(0, at - Date.now())
    const capped = Math.min(delay, 2_147_483_647)
    expiryTimer = setTimeout(() => {
      void loseSession()
    }, capped)
  }

  function onVisibilityCheck() {
    const at = expiresAt.value ?? readStoredExpiry()
    if (at != null && Date.now() >= at) {
      void loseSession()
    }
  }

  // Restore optimistic staff flag after hard reload (offline) until expiresAt.
  if (import.meta.client && !isStaff.value) {
    const stored = readStoredExpiry()
    const meta = readStoredMeta()
    if (stored != null && meta) {
      applySession({ ...meta, expiresAt: stored })
    }
  }

  if (import.meta.client && !visibilityHooked) {
    visibilityHooked = true
    document.addEventListener('visibilitychange', onVisibilityCheck)
    window.addEventListener('focus', onVisibilityCheck)
  }

  async function refresh() {
    try {
      const requestFetch = useRequestFetch()
      const res = await requestFetch<AdminMeResponse>('/api/admin/me')
      if (res.ok) {
        applySession({
          username: res.username,
          role: res.role,
          expiresAt: res.expiresAt,
        })
      } else {
        await loseSession()
      }
    } catch {
      const stored = expiresAt.value ?? readStoredExpiry()
      const meta =
        username.value && role.value
          ? { username: username.value, role: role.value }
          : readStoredMeta()
      if (stored != null && meta && Date.now() < stored) {
        applySession({ ...meta, expiresAt: stored })
      }
    }
  }

  async function login(creds: { username: string; password: string }) {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { username: creds.username, password: creds.password },
    })
    await refresh()
  }

  async function logout() {
    const ok = await confirm({
      title: 'Выход',
      message: 'Выйти из админ-режима?',
      confirmLabel: 'Выйти',
      cancelLabel: 'Отмена',
    })
    if (!ok) return false
    await $fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    await loseSession()
    return true
  }

  return {
    isStaff,
    /** True for any logged-in admin (legacy name kept for moderation gates that now mean staff). */
    isAdmin: isStaff,
    isSuperadmin,
    username,
    role,
    expiresAt,
    refresh,
    login,
    logout,
    loseSession,
  }
}
