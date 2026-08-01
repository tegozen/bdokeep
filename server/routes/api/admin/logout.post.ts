export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  clearAdminSession(event)
  return { ok: true }
})
