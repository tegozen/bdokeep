import MarkdownIt from 'markdown-it'
import filterXSS from 'xss'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const XSS_OPTIONS = {
  whiteList: {
    a: ['href', 'title', 'target', 'rel'],
    p: [],
    br: [],
    strong: [],
    b: [],
    em: [],
    i: [],
    del: [],
    s: [],
    code: [],
    pre: [],
    blockquote: [],
    ul: [],
    ol: [],
    li: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    hr: [],
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: [],
    td: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
} as const

/** Markdown → safe HTML for guide summaries (markdown-it + xss). */
export function renderMarkdown(raw: string): string {
  const text = raw ?? ''
  if (!text.trim()) return ''
  return filterXSS(md.render(text), XSS_OPTIONS)
}
