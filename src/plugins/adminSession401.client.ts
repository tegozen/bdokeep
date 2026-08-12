/**
 * Drop staff UI when any /api/admin call returns 401 (revoked session, disabled user).
 */
import { FetchError } from 'ofetch'
import { useSuperadmin } from '@/features/superadmin-auth'

function isAdminApiUrl(input: RequestInfo | URL): boolean {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
  try {
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0] || raw
    return path.startsWith('/api/admin')
  } catch {
    return String(raw).includes('/api/admin')
  }
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { loseSession } = useSuperadmin()
  const baseFetch = globalThis.$fetch

  globalThis.$fetch = async function adminAwareFetch(input, init) {
    try {
      return await baseFetch(input, init)
    } catch (err: unknown) {
      if (err instanceof FetchError && err.status === 401 && isAdminApiUrl(input)) {
        void loseSession()
      }
      throw err
    }
  } as typeof $fetch

  Object.assign(globalThis.$fetch, baseFetch)
  globalThis.$fetch.raw = baseFetch.raw
  globalThis.$fetch.native = baseFetch.native
  globalThis.$fetch.create = baseFetch.create
})
