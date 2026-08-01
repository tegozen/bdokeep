<template>
  <div
    :class="[$style.preview, attrs.class]"
    v-html="html"
  />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed, useAttrs } from 'vue'
import filterXSS from 'xss'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** Kept for call-site compatibility; unused (no md-editor id). */
    id?: string
  }>(),
  {
    id: 'summary-md-preview',
  },
)

const attrs = useAttrs()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const html = computed(() => {
  const raw = props.modelValue ?? ''
  if (!raw.trim()) return ''
  // markdown-it with html:false + xss whitelist — defense in depth (server also sanitizes).
  return filterXSS(md.render(raw), {
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
  })
})
</script>

<style module>
.preview {
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.65;
}

.preview :global(a) {
  color: var(--color-gold);
}

.preview :global(h1),
.preview :global(h2),
.preview :global(h3),
.preview :global(h4) {
  color: var(--color-gold-soft);
  font-family: var(--font-display);
}

.preview :global(pre) {
  overflow-x: auto;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-deep);
}

.preview :global(code) {
  font-size: 0.9em;
}

.preview :global(p) {
  margin: 0 0 0.75rem;
}

.preview :global(p:last-child) {
  margin-bottom: 0;
}

.preview :global(ul),
.preview :global(ol) {
  margin: 0 0 0.75rem;
  padding-left: 1.35rem;
}
</style>
