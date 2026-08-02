/**
 * Catalog / class icons are same-origin only (`/codex/…`, `/classes/…`).
 * Never return or render absolute CDN URLs in the browser.
 *
 * Bump CODEX_ICON_CACHE_V when re-mirroring icons so browsers drop poisoned 404 caches.
 */
export const CODEX_ICON_CACHE_V = '2'

/** True for paths we serve from this app (not third-party CDNs). */
export function isLocalAppImageUrl(url: string): boolean {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith('//')) return false
  return (
    url.startsWith('/codex/') ||
    url.startsWith('/classes/') ||
    url.startsWith('/api/youtube/thumb/') ||
    url.startsWith('/android-chrome-') ||
    url.startsWith('/favicon') ||
    url.startsWith('/apple-touch-icon')
  )
}

/**
 * Normalize icon URL for <img src>.
 * Remote/CDN URLs → null. Local `/codex/` paths get a cache-bust query.
 */
export function codexIconSrc(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (!isLocalAppImageUrl(trimmed)) return null
  if (!trimmed.startsWith('/codex/')) return trimmed
  const base = trimmed.split('?')[0]!
  return `${base}?v=${CODEX_ICON_CACHE_V}`
}

export function withCodexIconCacheBust<T extends { icon_url?: string | null }>(
  rows: readonly T[],
): T[] {
  return rows.map((row) => {
    const next = codexIconSrc(row.icon_url ?? null)
    if (next === (row.icon_url ?? null)) return row as T
    return { ...row, icon_url: next }
  })
}
