export function parseSubmitError(e: unknown, fallback = 'Не удалось отправить. Попробуйте позже.') {
  const msg =
    e && typeof e === 'object' && 'data' in e
      ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
      : ''
  return msg || fallback
}
