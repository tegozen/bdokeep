import { absoluteUrl, normalizeSiteUrl } from '@/shared/lib/siteUrl'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = normalizeSiteUrl(String(config.public.siteUrl || ''))
  const sitemap = absoluteUrl('/sitemap.xml', siteUrl)
  const sitemapLine = sitemap ? `Sitemap: ${sitemap}\n` : ''

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return ['User-Agent: *', 'Disallow: /admin', '', sitemapLine].join('\n')
})
