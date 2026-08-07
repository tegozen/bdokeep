import { absoluteUrl, normalizeSiteUrl } from '@/shared/lib/siteUrl'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))

  if (!siteUrl) {
    setResponseStatus(event, 503)
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'Sitemap requires NUXT_PUBLIC_SITE_URL (absolute site origin, no trailing slash).'
  }

  const sql = useDb()
  const classes = await withDbError(() => listPublishedClasses(sql))
  const paths = ['/', ...classes.map((c) => `/class/${c.slug}`)]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.flatMap((path) => {
      const loc = absoluteUrl(path, siteUrl)
      return loc ? [`  <url><loc>${escapeXml(loc)}</loc></url>`] : []
    }),
    '</urlset>',
    '',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return body
})
