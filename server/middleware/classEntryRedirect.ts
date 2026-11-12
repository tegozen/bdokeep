/**
 * Legacy /class/:slug links must lead to a deterministic guide preset.
 * Keep the entry URL out of the sitemap to avoid duplicate indexed pages.
 */
export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  const match = /^\/class\/([^/]+)\/?$/.exec(requestUrl.pathname)
  if (!match) return

  return sendRedirect(
    event,
    `/class/${match[1]}/awakening/t1${requestUrl.search}`,
    308,
  )
})
