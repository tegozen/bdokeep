const GUIDE_API_RE = /\/api\/classes\/([^/]+)\/guide(?:\?|$)/
const CLASS_PAGE_RE = /\/class\/([^/]+)(?:\?|$)/

const GUIDE_CACHE_NAMES = ['api-guides', 'pages'] as const

/**
 * Slugs that have a cached guide API response and/or /class/:slug HTML in SW caches.
 */
export async function listCachedGuideSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>()
  if (!import.meta.client || typeof caches === 'undefined') return slugs

  const names = await caches.keys()
  const targets = names.filter(
    (n) =>
      (GUIDE_CACHE_NAMES as readonly string[]).includes(n) ||
      n.includes('api-guides') ||
      n.includes('pages'),
  )

  await Promise.all(
    targets.map(async (name) => {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      for (const req of keys) {
        const path = (() => {
          try {
            return new URL(req.url).pathname + (new URL(req.url).search || '')
          } catch {
            return req.url
          }
        })()
        const guide = path.match(GUIDE_API_RE)
        if (guide?.[1]) {
          slugs.add(decodeURIComponent(guide[1]))
          continue
        }
        const page = path.match(CLASS_PAGE_RE)
        if (page?.[1]) slugs.add(decodeURIComponent(page[1]))
      }
    }),
  )

  return slugs
}
