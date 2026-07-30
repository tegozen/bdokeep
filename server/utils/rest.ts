import { PostgrestClient } from '@supabase/postgrest-js'

const DEMO_SERVICE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

export function getRestBaseUrl(): string {
  const config = useRuntimeConfig()
  const url = String(
    config.supabaseInternalUrl || config.public.supabaseUrl || 'http://127.0.0.1:8000',
  )
  return url.replace(/\/$/, '')
}

/** Server-only PostgREST client with service_role (bypasses RLS). */
export function getServiceRest(): PostgrestClient {
  const config = useRuntimeConfig()
  const key = String(config.supabaseServiceRoleKey || DEMO_SERVICE)
  const url = getRestBaseUrl()
  return new PostgrestClient(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
  })
}
