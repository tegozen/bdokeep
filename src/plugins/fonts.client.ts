/**
 * Brand fonts after first paint from /public/fonts (not Vite CSS graph).
 * font-display: optional → no CLS if late.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const id = 'bdokeep-fonts'
  if (document.getElementById(id)) return

  const load = () => {
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = '/fonts/bdokeep.css'
    link.media = 'print'
    link.onload = () => {
      link.media = 'all'
    }
    document.head.appendChild(link)
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 1200 })
  } else {
    requestAnimationFrame(() => setTimeout(load, 0))
  }
})
