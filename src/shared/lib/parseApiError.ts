/** Extract user-facing text from a Nuxt/$fetch error (createError / ofetch). */
export function parseApiError(e: unknown, fallback = 'Что-то пошло не так'): string {
  if (!e || typeof e !== 'object') return fallback

  const err = e as { data?: unknown; statusMessage?: unknown }
  const data = err.data

  if (data && typeof data === 'object') {
    const d = data as { statusMessage?: unknown; message?: unknown }
    const fromData = String(d.statusMessage || d.message || '').trim()
    if (fromData) return fromData
  }
  if (typeof data === 'string' && data.trim()) return data.trim()

  const statusMessage = String(err.statusMessage || '').trim()
  if (statusMessage) return statusMessage

  return fallback
}
