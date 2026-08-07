<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    :title="title"
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
        placeholder="Заметки по классу в Markdown…"
        height="100%"
      />
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import {
  comboKindLabel,
  type ComboKindId,
  type ProposalSection,
} from '@domain'
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
    /** PvP unless header preset is ПВЕ. */
    kind?: ComboKindId
    triggerLabel?: string
    initialText?: string | null
  }>(),
  {
    section: 'summary_awakening',
    kind: 'pvp',
    triggerLabel: 'Предложить',
    initialText: null,
  },
)

const text = ref('')

const isSuccession = computed(() => props.section === 'summary_succession')
const kindLabel = computed(() => comboKindLabel(props.kind))
const title = computed(
  () =>
    `Заметки: ${isSuccession.value ? 'наследие' : 'пробуждение'} · ${kindLabel.value}`,
)

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
  serialize: () => JSON.stringify({ kind: props.kind, text: text.value }),
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
      formError.value = 'Введите текст заметок'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: props.section,
      payload: { text: text.value.trim(), kind: props.kind },
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
