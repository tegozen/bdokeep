type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 5

/** Simple in-memory IP rate limit. Returns true if allowed. */
export function checkRateLimit(key: string, maxHits = MAX_HITS, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    buckets.set(key, bucket)
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  if (bucket.hits.length >= maxHits) return false
  bucket.hits.push(now)
  return true
}

export function clientIp(event: { node: { req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } } } }): string {
  const xf = event.node.req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0]!.trim()
  if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0]!.trim()
  return event.node.req.socket.remoteAddress || 'unknown'
}
