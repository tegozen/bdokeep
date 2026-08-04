const YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

/** iframe allow= for youtube-nocookie embeds. */
export const YOUTUBE_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure'

/** Allow only https YouTube hosts; normalize to canonical URL string. */
export function sanitizeYoutubeUrl(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed || /^\s*javascript:/i.test(trimmed)) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (!YT_HOSTS.has(url.hostname.toLowerCase())) return null

  return url.toString()
}

export function youtubeVideoId(raw: string): string | null {
  const safe = sanitizeYoutubeUrl(raw)
  if (!safe) return null

  const url = new URL(safe)
  const host = url.hostname.toLowerCase()

  let id: string | null = null

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = url.pathname.replace(/^\//, '').split('/')[0] || null
  } else if (url.pathname.startsWith('/embed/')) {
    id = url.pathname.split('/')[2] || null
  } else if (url.pathname.startsWith('/shorts/')) {
    id = url.pathname.split('/')[2] || null
  } else {
    id = url.searchParams.get('v')
  }

  if (!id || !/^[\w-]{6,32}$/.test(id)) return null
  return id
}

export function youtubeEmbedUrl(raw: string): string | null {
  const id = youtubeVideoId(raw)
  if (!id) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/** Same-origin thumb proxy — always 200 (real frame or placeholder). */
export function youtubeThumbProxyUrl(raw: string): string | null {
  const id = youtubeVideoId(raw)
  if (!id) return null
  return `/api/youtube/thumb/${encodeURIComponent(id)}`
}

export function isYoutubeVideoId(id: string): boolean {
  return /^[\w-]{6,32}$/.test(id)
}

/** Synthetic slot labels like «Видео 1» — not real YouTube titles. */
export function isPlaceholderVideoTitle(title: string | null | undefined): boolean {
  const t = String(title || '').trim()
  return !t || /^Видео\s+\d+$/i.test(t)
}
