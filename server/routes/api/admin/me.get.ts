export default defineEventHandler((event) => {
  return { ok: isAdminSession(event) }
})
