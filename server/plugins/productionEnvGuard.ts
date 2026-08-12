/**
 * Fail fast in production when required public env is missing.
 */
export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return

  const siteUrl = String(process.env.NUXT_PUBLIC_SITE_URL || '').trim()
  if (!siteUrl) {
    throw new Error(
      'NUXT_PUBLIC_SITE_URL is required in production (absolute origin, no trailing slash)',
    )
  }
  try {
    const parsed = new URL(siteUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('invalid protocol')
    }
  } catch {
    throw new Error(`NUXT_PUBLIC_SITE_URL is not a valid URL: ${siteUrl}`)
  }
})
