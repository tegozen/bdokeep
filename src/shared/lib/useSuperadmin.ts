import { clearAdminOfflineCaches } from './clearAdminOfflineCaches'
import { useConfirm } from './useConfirm'

type AdminMeResponse = { ok: false } | { ok: true; expiresAt: number }

const SESSION_EXPIRES_KEY = 'admin-session-expires-at'
/** Survives hard reload so offline admin UI can hydrate while cookie still valid. */
const SESSION_STORAGE_KEY = 'bdo_admin_expires_at'

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
      return null
    }
    return at
  } catch {
    return null
  }
}

function writeStoredExpiry(at: number | null) {
  if (!import.meta.client) return
  try {
    if (at == null) sessionStorage.removeItem(SESSION_STORAGE_KEY)
    else sessionStorage.setItem(SESSION_STORAGE_KEY, String(at))
  } catch {
    /* private mode */
  }
}

/**
 * Superadmin session + offline admin-cache purge on logout / expiry / 401.
 */
export function useSuperadmin() {
  const isSuperadmin = useState('superadmin', () => false)
  const expiresAt = useState<number | null>(SESSION_EXPIRES_KEY, () => null)
  const { confirm } = useConfirm()

  async function loseSession() {
    const hadSession = isSuperadmin.value || expiresAt.value != null || readStoredExpiry() != null
    clearExpiryTimer()
    expiresAt.value = null
    writeStoredExpiry(null)
    isSuperadmin.value = false
    if (hadSession) await clearAdminOfflineCaches()
  }

  function scheduleExpiryPurge(at: number) {
    clearExpiryTimer()
    expiresAt.value = at
    writeStoredExpiry(at)
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

  // Restore optimistic admin flag after hard reload (offline) until expiresAt.
  if (import.meta.client && !isSuperadmin.value) {
    const stored = readStoredExpiry()
    if (stored != null) {
      isSuperadmin.value = true
      expiresAt.value = stored
      scheduleExpiryPurge(stored)
    }
  }

  if (import.meta.client && !visibilityHooked) {
    visibilityHooked = true
    document.addEventListener('visibilitychange', onVisibilityCheck)
    window.addEventListener('focus', onVisibilityCheck)
  }

  async function refresh() {
    try {
      // useRequestFetch forwards cookie on SSR; plain $fetch does not.
      const requestFetch = useRequestFetch()
      const res = await requestFetch<AdminMeResponse>('/api/admin/me')
      if (res.ok) {
        isSuperadmin.value = true
        if (import.meta.client) scheduleExpiryPurge(res.expiresAt)
      } else {
        await loseSession()
      }
    } catch {
      // Network/offline — keep prior session; expiry timer + cookie-gate still apply.
      const stored = expiresAt.value ?? readStoredExpiry()
      if (stored != null && Date.now() < stored) {
        isSuperadmin.value = true
        if (expiresAt.value == null) scheduleExpiryPurge(stored)
      }
    }
  }

  async function login(password: string) {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { password },
    })
    isSuperadmin.value = true
    await refresh()
  }

  async function logout() {
    const ok = await confirm({
      title: 'Выход',
      message: 'Выйти из режима суперадмина?',
      confirmLabel: 'Выйти',
      cancelLabel: 'Отмена',
    })
    if (!ok) return false
    await $fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    await loseSession()
    return true
  }

  return { isSuperadmin, expiresAt, refresh, login, logout, loseSession }
}
