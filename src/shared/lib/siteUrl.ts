/** Strip trailing slashes; empty if unset. */
export function normalizeSiteUrl(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .replace(/\/+$/, '')
}

export function hasSiteUrl(raw?: string | null): boolean {
  return normalizeSiteUrl(raw) !== ''
}

/** Absolute URL for path, or null when siteUrl is not configured. */
export function absoluteUrl(path: string, siteUrl: string | undefined | null): string | null {
  const base = normalizeSiteUrl(siteUrl)
  if (!base) return null
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export const SITE_DESCRIPTION =
  'Неофициальные гильдейские гайды по классам Black Desert Online — PvP и PvE'

export const SITE_TITLE = 'BDO Keep — гильдейские гайды BDO (PvP и PvE)'

export const SITE_OG_IMAGE_PATH = '/android-chrome-512x512.png'
