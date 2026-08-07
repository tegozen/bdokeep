<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить роль на осаде"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    full
    @submit="onSubmit"
  >
    <div v-if="open" :class="[$style.label, $style.summaryEditor]">
      <span>Markdown</span>
      <UiMarkdownEditor
        id="propose-summary-editor"
        v-model="text"
        placeholder="Опишите роль класса на осаде в Markdown…"
        height="100%"
      />
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import type { ProposalSection } from '@/entities/class'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import ProposeModalShell from './ProposeModalShell.vue'

const UiMarkdownEditor = defineAsyncComponent(
  () => import('@/shared/ui/UiMarkdownEditor.vue'),
)

const props = withDefaults(
  defineProps<{
    classSlug: string
    section?: Extract<ProposalSection, 'summary_awakening' | 'summary_succession'>
    triggerLabel?: string
    initialText?: string | null
  }>(),
  {
    section: 'summary_awakening',
    triggerLabel: 'Предложить',
    initialText: null,
  },
)

const text = ref('')

const {
  open,
  honeypot,
  author,
  submitting,
  formError,
  requestClose,
  isSuperadmin,
  openModal,
  runSubmit,
} = useProposeModal({
  classSlug: () => props.classSlug,
  serialize: () => JSON.stringify({ text: text.value }),
  onOpen: () => {
    text.value = props.initialText?.trim() ? props.initialText : ''
  },
  onReset: () => {
    text.value = ''
  },
})

defineExpose({ openModal })

async function onSubmit() {
  await runSubmit(async () => {
    if (!text.value.trim()) {
      formError.value = 'Введите текст сути'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: props.section,
      payload: { text: text.value.trim() },
      author_label: author.value.trim() || undefined,
      website: honeypot.value,
    })
  })
}
</script>

<style module>
.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.summaryEditor {
  flex: 1;
  min-height: 0;
  grid-template-rows: auto 1fr;
}

.summaryEditor :global(.md-editor) {
  min-height: 0;
  height: 100% !important;
}
</style>
