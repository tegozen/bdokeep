/**
 * routeRules Cache-Control on /codex/** also applied to 404s, so a missing
 * icon got cached for a week and stayed broken after the file appeared.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const path = getRequestURL(event).pathname
    if (!path.startsWith('/codex/')) return
    const status = getResponseStatus(event)
    if (status >= 400) {
      setResponseHeader(event, 'Cache-Control', 'no-store')
    }
  })
})
