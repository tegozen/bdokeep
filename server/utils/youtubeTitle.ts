import { isYoutubeVideoId } from '@bdokeep/domain'

const TITLE_MAX = 120
const titleCache = new Map<string, string | null>()
const TITLE_CACHE_MAX = 500

/** YouTube oEmbed — no API key; null when private/deleted/unreachable. */
export async function fetchYoutubeTitle(id: string): Promise<string | null> {
  if (!isYoutubeVideoId(id)) return null
  if (titleCache.has(id)) return titleCache.get(id) ?? null

  let title: string | null = null
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    const res = await fetch(oembed, {
      redirect: 'follow',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) {
      const data = (await res.json()) as { title?: unknown }
      const raw = String(data?.title || '').trim()
      if (raw) title = raw.slice(0, TITLE_MAX)
    }
  } catch {
    // network / timeout — keep null
  }

  if (titleCache.size >= TITLE_CACHE_MAX) {
    const first = titleCache.keys().next().value
    if (first !== undefined) titleCache.delete(first)
  }
  titleCache.set(id, title)
  return title
}

export function clearYoutubeTitleCache(id: string): void {
  titleCache.delete(id)
}
