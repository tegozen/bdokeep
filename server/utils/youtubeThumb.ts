const THUMB_QUALITIES = ['hqdefault', 'mqdefault', 'sddefault', 'default'] as const

// Background only — play control is drawn by YoutubeEmbed facade CSS.
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img">
  <defs>
    <radialGradient id="g" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#2a2a32"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
</svg>`

export function isYoutubeVideoId(id: string): boolean {
  return /^[\w-]{6,32}$/.test(id)
}

/** True when ytimg serves a real frame (dead / unknown ids fail). */
export async function youtubeVideoHasThumb(id: string): Promise<boolean> {
  const found = await fetchFirstYoutubeThumb(id)
  return found !== null
}

export async function resolveYoutubeThumb(id: string): Promise<{
  body: Buffer
  contentType: string
  cacheControl: string
  fromYoutube: boolean
}> {
  const found = await fetchFirstYoutubeThumb(id)
  if (found) {
    return {
      ...found,
      cacheControl: 'public, max-age=86400, stale-while-revalidate=604800',
      fromYoutube: true,
    }
  }

  return {
    body: Buffer.from(PLACEHOLDER_SVG, 'utf8'),
    contentType: 'image/svg+xml; charset=utf-8',
    cacheControl: 'public, max-age=3600',
    fromYoutube: false,
  }
}

async function fetchFirstYoutubeThumb(
  id: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  for (const quality of THUMB_QUALITIES) {
    const url = `https://i.ytimg.com/vi/${id}/${quality}.jpg`
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { Accept: 'image/*' },
      })
      if (!res.ok) continue
      const body = Buffer.from(await res.arrayBuffer())
      // Empty / error stubs from ytimg are tiny; skip and try next quality.
      if (body.byteLength < 1200) continue
      return {
        body,
        contentType: res.headers.get('content-type') || 'image/jpeg',
      }
    } catch {
      // try next quality
    }
  }
  return null
}
