const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 5

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

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

function checkRateLimitMemory(
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
  if (buckets.size > 4096) {
    for (const [k, b] of buckets) {
      if (!b.hits.length || now - (b.hits[b.hits.length - 1] ?? 0) >= windowMs) {
        buckets.delete(k)
      }
    }
  }
  return { allowed: true, retryAfterMs: 0 }
}

async function checkRateLimitDb(
  key: string,
  maxHits: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const sql = useDb()
  const windowStart = new Date(Date.now() - windowMs).toISOString()

  const countRows = await sql`
    select count(*)::int as c
    from rate_limit_hits
    where rate_key = ${key} and hit_at > ${windowStart}::timestamptz
  `
  const count = Number(countRows[0]?.c ?? 0)

  if (count >= maxHits) {
    const oldestRows = await sql`
      select hit_at
      from rate_limit_hits
      where rate_key = ${key} and hit_at > ${windowStart}::timestamptz
      order by hit_at asc
      limit 1
    `
    const oldestAt = oldestRows[0]?.hit_at
    const oldestMs = oldestAt ? new Date(String(oldestAt)).getTime() : Date.now()
    return {
      allowed: false,
      retryAfterMs: Math.max(1, windowMs - (Date.now() - oldestMs)),
    }
  }

  await sql`
    insert into rate_limit_hits (rate_key, hit_at)
    values (${key}, now())
  `
  await sql`
    delete from rate_limit_hits
    where rate_key = ${key} and hit_at <= ${windowStart}::timestamptz
  `

  return { allowed: true, retryAfterMs: 0 }
}

/** IP/login rate limit — Postgres-backed with in-memory fallback. Records a hit when allowed. */
export async function checkRateLimit(
  key: string,
  maxHits = MAX_HITS,
  windowMs = WINDOW_MS,
): Promise<RateLimitResult> {
  try {
    return await checkRateLimitDb(key, maxHits, windowMs)
  } catch {
    return checkRateLimitMemory(key, maxHits, windowMs)
  }
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
  if (!trustProxyEnabled()) return socketIp
  return firstForwardedHop(event.node.req.headers['x-forwarded-for']) || socketIp
}
