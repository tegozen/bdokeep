/**
 * Non-blocking entry CSS via media=print → onload media=all.
 * No separate <link rel=preload>: Nuxt marks the stylesheet with crossorigin, and a
 * preload without matching crossorigin is ignored (credentials mode mismatch) —
 * which delayed CSS and tanked Lighthouse to ~86.
 * Critical layout: Vue CSS modules (SSR-inlined).
 */
const STYLE_LINK =
  /<link([^>]*\brel=["']stylesheet["'][^>]*href=["'](\/_nuxt\/style\.[^"']+\.css)["'][^>]*)>/gi
const STYLE_LINK_ALT =
  /<link([^>]*href=["'](\/_nuxt\/style\.[^"']+\.css)["'][^>]*\brel=["']stylesheet["'][^>]*)>/gi

function toAsync(attrs: string, href: string): string {
  if (/media=["']print["']/.test(attrs)) {
    return `<link${attrs}>`
  }
  // Drop crossorigin — same-origin CSS doesn't need it, and it broke preload pairing.
  const rest = attrs
    .replace(/\s*rel=["']stylesheet["']/i, '')
    .replace(/\s*href=["'][^"']+["']/i, '')
    .replace(/\s*crossorigin(?:=["'][^"']*["'])?/i, '')
  return [
    `<link rel="stylesheet" href="${href}"${rest} media="print" onload="this.media='all'">`,
    `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
  ].join('')
}

function rewrite(chunk: string): string {
  let out = chunk
  for (const re of [STYLE_LINK, STYLE_LINK_ALT]) {
    out = out.replace(re, (_m, attrs: string, href: string) => toAsync(attrs, href))
  }
  return out
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    if (!html.head?.length) return
    for (let i = 0; i < html.head.length; i++) {
      const chunk = html.head[i]
      if (typeof chunk !== 'string' || !chunk.includes('/_nuxt/style.')) continue
      html.head[i] = rewrite(chunk)
    }
  })
})
