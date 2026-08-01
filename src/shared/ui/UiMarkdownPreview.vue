<template>
  <ClientOnly>
    <MdPreview
      :id="id"
      :model-value="modelValue"
      theme="dark"
      language="ru"
      preview-theme="github"
      code-theme="github"
      :class="[$style.preview, attrs.class]"
    />
    <template #fallback>
      <div :class="[$style.fallback, attrs.class]">{{ modelValue }}</div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    modelValue: string
    id?: string
  }>(),
  {
    id: 'summary-md-preview',
  },
)

const attrs = useAttrs()
</script>

<style module>
.preview {
  --md-color: var(--color-ink);
  --md-bk-color: transparent;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
}

.preview :global(.md-editor-preview-wrapper) {
  padding: 0;
}

.preview :global(.md-editor-preview) {
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.65;
}

.preview :global(.md-editor-preview a) {
  color: var(--color-gold);
}

.preview :global(.md-editor-preview h1),
.preview :global(.md-editor-preview h2),
.preview :global(.md-editor-preview h3),
.preview :global(.md-editor-preview h4) {
  color: var(--color-gold-soft);
  font-family: var(--font-display);
}

.fallback {
  white-space: pre-wrap;
  color: var(--color-ink);
  line-height: 1.65;
}
</style>
