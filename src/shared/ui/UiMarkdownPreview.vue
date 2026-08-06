<template>
  <div
    :class="[$style.preview, attrs.class]"
    v-html="html"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { renderMarkdown } from '@/shared/lib/renderMarkdown'

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

// Sync on server + client — async paint left SSR HTML vs empty client v-html (hydration mismatch).
const html = computed(() => renderMarkdown(props.modelValue ?? ''))
</script>

<style module>
.preview {
  min-width: 0;
  max-width: 100%;
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
  word-break: break-word;
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
