/**
 * Gzip HTML/JSON when the client accepts it.
 * Uses `beforeResponse` (covers cached/SWR responses if re-enabled later;
 * `render:response` only runs on the first render).
 *
 * Prefer nginx gzip in production; set NITRO_COMPRESS=0 to disable.
 */
import { gzipSync } from 'node:zlib'
import type { H3Event } from 'h3'

function bodyToBuffer(body: unknown): Buffer | null {
  if (body == null) return null
  if (typeof body === 'string') return Buffer.from(body, 'utf8')
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)
  return null
}

function compressibleContentType(event: H3Event): boolean {
  const raw = getResponseHeader(event, 'content-type')
  const ct = Array.isArray(raw) ? raw.join(';') : String(raw || '')
  if (!ct) {
    // Nuxt page renders often set content-type later; compress text routes by path.
    const path = event.path || ''
    return (
      path === '/' ||
      path.startsWith('/class') ||
      path.startsWith('/admin') ||
      path.endsWith('.json') ||
      path.startsWith('/api/')
    )
  }
  return /text\/html|application\/json|application\/javascript|text\/css|text\/plain|application\/manifest\+json/i.test(
    ct,
  )
}

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NITRO_COMPRESS === '0') return

  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    if (event.node.res.headersSent) return
    if (getResponseHeader(event, 'content-encoding')) return
    if (!compressibleContentType(event)) return

    const accept = getRequestHeader(event, 'accept-encoding') || ''
    if (!/\bgzip\b/i.test(accept)) return

    const buf = bodyToBuffer(response.body)
    if (!buf || buf.byteLength < 512) return

    const compressed = gzipSync(buf, { level: 6 })
    const vary = getResponseHeader(event, 'vary')
    const varyStr = Array.isArray(vary) ? vary.join(', ') : String(vary || '')
    const varyValue = varyStr
      ? /\baccept-encoding\b/i.test(varyStr)
        ? varyStr
        : `${varyStr}, Accept-Encoding`
      : 'Accept-Encoding'

    response.body = compressed
    setResponseHeader(event, 'content-encoding', 'gzip')
    setResponseHeader(event, 'vary', varyValue)
    setResponseHeader(event, 'content-length', compressed.byteLength)
  })
})
