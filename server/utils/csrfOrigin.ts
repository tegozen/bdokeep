/**
 * Same-origin check for cookie-authenticated mutating requests (CSRF defense-in-depth).
 * Browsers send Origin on cross-origin POST; we require Origin (or Referer) host === request host.
 *
 * Compare hostname only: reverse proxies often forward `Host` without the public port
 * (`$host` vs `$http_host`), so `localhost:3000` Origin would fail against `localhost`.
 */
export function assertSameOrigin(event: Parameters<typeof getRequestURL>[0]) {
  const method = (event.node?.req?.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  const reqUrl = getRequestURL(event)
  const origin = getHeader(event, 'origin')
  if (origin) {
    try {
      const o = new URL(origin)
      if (o.hostname === reqUrl.hostname) return
    } catch {
      /* invalid Origin */
    }
    throw createError({ statusCode: 403, statusMessage: 'Некорректный Origin' })
  }

  const referer = getHeader(event, 'referer')
  if (referer) {
    try {
      const r = new URL(referer)
      if (r.hostname === reqUrl.hostname) return
    } catch {
      /* invalid Referer */
    }
  }

  throw createError({ statusCode: 403, statusMessage: 'Некорректный Origin' })
}
