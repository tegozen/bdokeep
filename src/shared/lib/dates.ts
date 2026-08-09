/** Fixed zone so SSR (Docker UTC) and browser match — avoids hydration mismatches. */
const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
})

const DATE_TIME_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Europe/Moscow',
})

export function formatRuDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return DATE_FMT.format(d)
}

/** Date + time (Europe/Moscow), same zone as `formatRuDate`. */
export function formatRuDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return DATE_TIME_FMT.format(d)
}
