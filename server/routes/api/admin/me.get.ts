export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await ensureBootstrapSuperadmin().catch(() => {})
  return getAdminSessionMeta(event)
})
