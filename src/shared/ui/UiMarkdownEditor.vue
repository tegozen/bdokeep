<template>
  <component
    :is="Editor"
    v-if="Editor"
    :id="id"
    v-model="text"
    theme="dark"
    language="ru"
    preview-theme="github"
    code-theme="github"
    :toolbars="toolbars"
    :footers="footers"
    :no-upload-img="true"
    no-katex
    no-mermaid
    no-echarts
    :placeholder="placeholder"
    :style="{ height }"
    :class="$style.editor"
  />
  <textarea
    v-else
    v-model="text"
    :class="$style.fallback"
    :rows="12"
    :placeholder="placeholder"
    required
    :maxlength="MAX_TEXT_LEN"
  />
</template>

<script setup lang="ts">
import { onMounted, shallowRef, type Component } from 'vue'
import type { Footers, ToolbarNames } from 'md-editor-v3'
import { MAX_TEXT_LEN } from '@domain'

const text = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    height?: string
  }>(),
  {
    id: 'summary-md-editor',
    placeholder: 'Markdown…',
    height: '360px',
  },
)

const Editor = shallowRef<Component | null>(null)

onMounted(async () => {
  const { ensureMdEditorConfigured } = await import('./mdEditorSetup.client')
  await ensureMdEditorConfigured()
  await import('md-editor-v3/lib/style.css')
  const mod = await import('md-editor-v3')
  Editor.value = mod.MdEditor
})

const toolbars: ToolbarNames[] = [
  'bold',
  'underline',
  'italic',
  'strikeThrough',
  '-',
  'title',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'table',
  '-',
  'revoke',
  'next',
  '=',
  'preview',
  'previewOnly',
  'pageFullscreen',
  'fullscreen',
]

const footers: Footers[] = ['markdownTotal', '=', 'scrollSwitch']
</script>

<style module>
.editor {
  border: 1px solid var(--color-border) !important;
  border-radius: 0.35rem;
  --md-color: var(--color-ink);
  --md-bk-color: var(--color-bg);
  --md-border-color: var(--color-border);
  min-height: 0;
}

.editor :global(.md-editor-toolbar-wrapper),
.editor :global(.md-editor-footer) {
  background: var(--color-bg-elevated);
  border-color: var(--color-border);
}

.editor :global(.md-editor-input-wrapper),
.editor :global(.md-editor-preview-wrapper) {
  background: var(--color-bg);
}

.fallback {
  display: block;
  width: 100%;
  min-height: 12rem;
  border: 1px solid var(--color-border);
  border-radius: 0.35rem;
  background: var(--color-bg);
  color: var(--color-ink);
  padding: 0.65rem 0.75rem;
  font: inherit;
  resize: vertical;
}
</style>
