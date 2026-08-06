/**
 * Manifest after first paint — keeps /manifest.webmanifest off the LCP/FCP critical chain.
 * PWA install still works once the link is in the document.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const id = 'bdokeep-manifest'
  if (document.getElementById(id)) return

  const load = () => {
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'manifest'
    link.href = '/manifest.webmanifest'
    document.head.appendChild(link)
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 2000 })
  } else {
    setTimeout(load, 1)
  }
})
