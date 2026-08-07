import { createError } from 'h3'

export const GUILD_BANNER_BODY_MAX = 280
export const GUILD_BANNER_LINKS_MAX = 10
export const GUILD_BANNER_LABEL_MAX = 40
export const GUILD_BANNER_ICON_MAX_BYTES = 128 * 1024

const ALLOWED_ICON_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export type GuildBannerLink = {
  label: string
  url: string
}

export function parseGuildBannerLinks(raw: unknown): GuildBannerLink[] {
  if (raw == null) return []
  if (!Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'links должен быть массивом' })
  }
  if (raw.length > GUILD_BANNER_LINKS_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Не больше ${GUILD_BANNER_LINKS_MAX} ссылок`,
    })
  }

  const out: GuildBannerLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw createError({ statusCode: 400, statusMessage: 'Некорректная ссылка' })
    }
    const label = String((item as { label?: unknown }).label ?? '').trim()
    const url = String((item as { url?: unknown }).url ?? '').trim()
    if (!label && !url) continue
    if (!label || label.length > GUILD_BANNER_LABEL_MAX) {
      throw createError({
        statusCode: 400,
        statusMessage: `Подпись ссылки: 1–${GUILD_BANNER_LABEL_MAX} символов`,
      })
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw createError({ statusCode: 400, statusMessage: `Некорректный URL: ${label}` })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw createError({
        statusCode: 400,
        statusMessage: `Ссылка «${label}»: только http/https`,
      })
    }
    out.push({ label, url: parsed.toString() })
  }
  return out
}

export function parseGuildBannerBody(raw: unknown): string {
  const body = String(raw ?? '').trim()
  if (body.length > GUILD_BANNER_BODY_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Текст слишком длинный (макс. ${GUILD_BANNER_BODY_MAX})`,
    })
  }
  return body
}

export function parseGuildBannerIcon(input: {
  icon_base64?: unknown
  icon_mime?: unknown
  clear_icon?: unknown
}): { clear: boolean; mime: string | null; bytes: Buffer | null } {
  if (input.clear_icon === true) {
    return { clear: true, mime: null, bytes: null }
  }

  const b64raw = input.icon_base64
  if (b64raw == null || b64raw === '') {
    return { clear: false, mime: null, bytes: null }
  }

  const mime = String(input.icon_mime || '')
    .trim()
    .toLowerCase()
    .split(';')[0]
    ?.trim()
  if (!mime || !ALLOWED_ICON_MIMES.has(mime)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Иконка: PNG, JPEG, WebP или GIF',
    })
  }

  let b64 = String(b64raw).trim()
  const dataUrl = /^data:([\w/+.-]+);base64,(.+)$/i.exec(b64)
  if (dataUrl) {
    const dataMime = dataUrl[1].toLowerCase()
    if (!ALLOWED_ICON_MIMES.has(dataMime)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Иконка: PNG, JPEG, WebP или GIF',
      })
    }
    b64 = dataUrl[2]
  }

  let bytes: Buffer
  try {
    bytes = Buffer.from(b64, 'base64')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Некорректная иконка' })
  }
  if (!bytes.length) {
    throw createError({ statusCode: 400, statusMessage: 'Пустая иконка' })
  }
  if (bytes.length > GUILD_BANNER_ICON_MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `Иконка слишком большая (макс. ${GUILD_BANNER_ICON_MAX_BYTES / 1024} КБ)`,
    })
  }

  return { clear: false, mime: dataUrl ? dataUrl[1].toLowerCase() : mime, bytes }
}

export function normalizeGuildBannerLinksFromDb(raw: unknown): GuildBannerLink[] {
  if (!Array.isArray(raw)) return []
  const out: GuildBannerLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const label = String((item as { label?: unknown }).label ?? '').trim()
    const url = String((item as { url?: unknown }).url ?? '').trim()
    if (!label || !url) continue
    out.push({ label, url })
  }
  return out
}

export function isoTs(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return String(value ?? '')
}
