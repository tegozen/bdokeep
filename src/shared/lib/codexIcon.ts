/**
 * Catalog / class icons are same-origin only (`/codex/…`, `/classes/…`).
 * Never hotlink bdocodex / other CDNs in the browser.
 *
 * Bump CODEX_ICON_CACHE_V when re-mirroring icons so browsers drop poisoned 404 caches.
 */
export const CODEX_ICON_CACHE_V = '4'

/** Rewrite known CDN hosts to local /codex paths (DB may still hold old URLs). */
export function rewriteRemoteIconToLocal(url: string): string {
  let u = url.trim()
  if (!u) return u

  // //bdocodex.com/items/... or https://bdocodex.com/items/...
  u = u.replace(/^https?:\/\/bdocodex\.com(?=\/)/i, '')
  u = u.replace(/^\/\/bdocodex\.com(?=\/)/i, '')

  // leftover absolute path from codex site
  if (u.startsWith('/items/')) return `/codex${u}`
  if (u.startsWith('items/')) return `/codex/${u}`

  // already /codex/... or other local
  return u
}

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
 * Normalize icon URL for <img src> / API payloads.
 * bdocodex CDN → /codex/…; other remotes → null; /codex/ gets cache-bust.
 */
export function codexIconSrc(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = rewriteRemoteIconToLocal(url)
  if (!trimmed) return null
  if (!isLocalAppImageUrl(trimmed)) return null
  if (!trimmed.startsWith('/codex/')) return trimmed
  const base = trimmed.split('?')[0]!
  return `${base}?v=${CODEX_ICON_CACHE_V}`
}

/** Strip query for DB storage; keep local path only. */
export function codexIconDbPath(url: string | null | undefined): string | null {
  const src = codexIconSrc(url)
  if (!src) return null
  return src.split('?')[0] ?? null
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

/** Deep-rewrite any `icon_url` string fields in JSON-like guide payloads. */
export function rewriteIconUrlsDeep<T>(value: T): T {
  if (value == null) return value
  if (Array.isArray(value)) {
    return value.map((item) => rewriteIconUrlsDeep(item)) as T
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (
        (k === 'icon_url' || k === 'portrait_url') &&
        (typeof v === 'string' || v == null)
      ) {
        out[k] = codexIconSrc(v as string | null)
      } else {
        out[k] = rewriteIconUrlsDeep(v)
      }
    }
    return out as T
  }
  return value
}
