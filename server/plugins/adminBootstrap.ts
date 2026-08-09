/**
 * Ensure bootstrap superadmin exists once Nitro is ready.
 * Failures are logged; login path also calls ensureBootstrapSuperadmin.
 */
export default defineNitroPlugin(() => {
  void ensureBootstrapSuperadmin().catch((err) => {
    console.error('[adminAuth] bootstrap failed', err)
  })
})
