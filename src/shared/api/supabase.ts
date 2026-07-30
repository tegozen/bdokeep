import { PostgrestClient } from '@supabase/postgrest-js'

/** Demo anon JWT — replace in production */
const DEMO_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

let browserClient: PostgrestClient | null = null
let browserClientKey: string | null = null

function resolveUrl(): string {
  const config = useRuntimeConfig()
  // Browser → same-origin Nuxt proxy (avoids PostgREST CORS gaps)
  if (import.meta.client) {
    return `${window.location.origin}/api/db`
  }
  // SSR in Docker → rest service; local nuxt → host API port
  if (config.supabaseInternalUrl) {
    return config.supabaseInternalUrl as string
  }
  return (config.public.supabaseUrl as string) || 'http://127.0.0.1:8000'
}

function createRestClient(url: string, anonKey: string): PostgrestClient {
  return new PostgrestClient(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  })
}

/**
 * Bare PostgREST client (no /rest/v1 prefix — that path is only on full Supabase Kong).
 */
export function getSupabase(): PostgrestClient {
  const config = useRuntimeConfig()
  const url = resolveUrl().replace(/\/$/, '')
  const anonKey = (config.public.supabaseAnonKey as string) || DEMO_ANON
  const key = `${url}::${anonKey}`

  // Fresh client on server — avoids sticky base URL across SSR requests
  if (import.meta.server) {
    return createRestClient(url, anonKey)
  }

  if (browserClient && browserClientKey === key) return browserClient

  browserClient = createRestClient(url, anonKey)
  browserClientKey = key
  return browserClient
}
