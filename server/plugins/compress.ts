/**
 * Gzip SSR HTML when the client accepts it.
 * Prefer nginx gzip in production; set NITRO_COMPRESS=0 to disable this plugin.
 */
import { gzipSync } from 'node:zlib'

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NITRO_COMPRESS === '0') return

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (!response.body || typeof response.body !== 'string') return
    if (event.node.res.headersSent) return

    const headers = { ...(response.headers || {}) }
    if (headers['content-encoding'] || headers['Content-Encoding']) return

    const accept = getRequestHeader(event, 'accept-encoding') || ''
    if (!/\bgzip\b/i.test(accept)) return

    const compressed = gzipSync(Buffer.from(response.body, 'utf8'), { level: 5 })
    const vary = headers.vary || headers.Vary
    const varyValue = vary
      ? /\baccept-encoding\b/i.test(String(vary))
        ? String(vary)
        : `${vary}, Accept-Encoding`
      : 'Accept-Encoding'

    response.body = compressed as unknown as string
    response.headers = {
      ...headers,
      'content-encoding': 'gzip',
      vary: varyValue,
      'content-length': String(compressed.byteLength),
    }
  })
})
