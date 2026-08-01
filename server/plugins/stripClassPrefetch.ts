/**
 * Class guide pages declare many defineAsyncComponent propose/editor chunks.
 * Nuxt would otherwise <link rel="prefetch"> them into the initial document
 * (~md-editor / highlight), defeating lazy-loading for Lighthouse/FCP.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const path = event.path || ''
    if (!path.startsWith('/class/')) return
    html.head = html.head.map((chunk) =>
      chunk.replace(/<link\b[^>]*\brel=["']prefetch["'][^>]*>/gi, ''),
    )
  })
})
