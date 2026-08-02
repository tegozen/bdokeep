type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 5

export type RateLimitResult = {
  allowed: boolean
  /** Ms until the oldest hit leaves the window (0 when allowed). */
  retryAfterMs: number
}

/** Format a wait duration for Russian UI copy. */
export function formatRetryAfterRu(ms: number): string {
  const sec = Math.max(1, Math.ceil(ms / 1000))
  if (sec < 60) return `${sec} сек`
  const min = Math.ceil(sec / 60)
  return `${min} мин`
}

/** Simple in-memory IP rate limit. Records a hit when allowed. */
export function checkRateLimit(
  key: string,
  maxHits = MAX_HITS,
  windowMs = WINDOW_MS,
): RateLimitResult {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    buckets.set(key, bucket)
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  if (bucket.hits.length >= maxHits) {
    const oldest = bucket.hits[0] ?? now
    return {
      allowed: false,
      retryAfterMs: Math.max(1, windowMs - (now - oldest)),
    }
  }
  bucket.hits.push(now)
  return { allowed: true, retryAfterMs: 0 }
}

type ReqLike = {
  node: {
    req: {
      headers: Record<string, string | string[] | undefined>
      socket: { remoteAddress?: string }
    }
  }
}

function firstForwardedHop(xf: string | string[] | undefined): string | null {
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0]!.trim() || null
  if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0]!.trim() || null
  return null
}

/**
 * Client IP for rate limiting.
 * By default uses the TCP peer address only — raw X-Forwarded-For is spoofable.
 * Set TRUST_PROXY=1 when Nitro sits behind a reverse proxy that strips/forges XFF.
 */
export function clientIp(event: ReqLike): string {
  const socketIp = event.node.req.socket.remoteAddress || 'unknown'
  const trustProxy =
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY === 'true' ||
    process.env.NUXT_TRUST_PROXY === '1'

  if (!trustProxy) return socketIp

  return firstForwardedHop(event.node.req.headers['x-forwarded-for']) || socketIp
}
