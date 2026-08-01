const DANGEROUS_SCHEME = /^(?:javascript|data|vbscript|blob)\s*:/i

/** HTML tags that must never appear in guide markdown (case-insensitive). */
const DANGEROUS_BLOCK =
  /<\s*(script|style|iframe|object|embed|link|meta|base|form|svg|math|video|audio|source|img)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
const DANGEROUS_VOID =
  /<\s*(script|style|iframe|object|embed|link|meta|base|form|svg|math|video|audio|source|img)\b[^>]*\/?\s*>/gi

/** Strip on* event handlers and javascript: from residual HTML attributes. */
const EVENT_ATTR = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JS_HREF =
  /\s+(href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript|data|vbscript|blob)\s*:[^"]*"|'\s*(?:javascript|data|vbscript|blob)\s*:[^']*'|\s*(?:javascript|data|vbscript|blob)\s*:[^\s>]+)/gi

/** Strip dangerous URL schemes from markdown links/images (handles nested parens in URLs). */
function scrubMarkdownUrls(md: string): string {
  const re = /!?\[([^\]]*)]\(/g
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(md))) {
    let i = m.index + m[0].length
    let depth = 1
    const urlStart = i
    while (i < md.length && depth > 0) {
      const c = md[i++]
      if (c === '(') depth++
      else if (c === ')') depth--
    }
    if (depth !== 0) continue

    out += md.slice(last, m.index)
    const url = md
      .slice(urlStart, i - 1)
      .trim()
      .replace(/^</, '')
      .replace(/>$/, '')
    const bang = m[0].startsWith('!') ? '!' : ''
    const alt = m[1] ?? ''
    out += DANGEROUS_SCHEME.test(url) ? `${bang}[${alt}](#)` : md.slice(m.index, i)
    last = i
    re.lastIndex = i
  }
  return out + md.slice(last)
}

/**
 * Defense-in-depth for guide summary markdown before it hits live tables.
 * Removes dangerous HTML tags/handlers without mangling plain `<` comparisons,
 * and neuters javascript:/data: URLs in markdown link/image syntax.
 * Client XSSPlugin still filters at render time.
 */
export function sanitizeMarkdown(raw: string): string {
  const withoutTags = raw
    .replace(DANGEROUS_BLOCK, '')
    .replace(DANGEROUS_VOID, '')
    .replace(EVENT_ATTR, '')
    .replace(JS_HREF, '')
  return scrubMarkdownUrls(withoutTags)
}
