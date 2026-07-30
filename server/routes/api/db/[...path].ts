/**
 * Same-origin proxy to PostgREST.
 * Browser cannot call :8000 directly — PostgREST CORS preflight
 * does not allow Authorization / apikey headers.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const base = String(
    config.supabaseInternalUrl || config.public.supabaseUrl || 'http://127.0.0.1:8000',
  ).replace(/\/$/, '')

  const pathParam = getRouterParam(event, 'path')
  const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || ''
  const query = getRequestURL(event).search
  const target = `${base}/${path}${query}`

  return proxyRequest(event, target)
})
