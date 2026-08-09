/** Workbox runtime cache names for admin offline snapshots. */
export const ADMIN_OFFLINE_CACHE_NAMES = ['admin-pages', 'admin-api'] as const

function isAdminCacheKey(url: string): boolean {
  try {
    const u = new URL(url, 'http://local')
    return u.pathname.startsWith('/admin') || u.pathname.startsWith('/api/admin')
  } catch {
    return url.includes('/admin') || url.includes('/api/admin')
  }
}

/**
 * Drop admin offline snapshots from Cache Storage.
 * Deletes named admin caches and sweeps any /admin|/api/admin keys in other caches.
 */
export async function clearAdminOfflineCaches(): Promise<void> {
  if (!import.meta.client || typeof caches === 'undefined') return

  await Promise.all(ADMIN_OFFLINE_CACHE_NAMES.map((name) => caches.delete(name)))

  const names = await caches.keys()
  await Promise.all(
    names.map(async (name) => {
      if ((ADMIN_OFFLINE_CACHE_NAMES as readonly string[]).includes(name)) return
      const cache = await caches.open(name)
      const keys = await cache.keys()
      await Promise.all(
        keys
          .filter((req) => isAdminCacheKey(req.url))
          .map((req) => cache.delete(req)),
      )
    }),
  )
}
