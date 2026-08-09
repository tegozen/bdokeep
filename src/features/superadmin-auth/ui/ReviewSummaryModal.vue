<template>
  <UiModal
    :open="open"
    title="Редактировать заметки"
    aria-label="Редактировать заметки перед одобрением"
    full
    :z-index="90"
    @close="requestClose"
  >
    <div :class="$style.body">
      <div :class="$style.editorWrap">
        <span :class="$style.label">Markdown</span>
        <UiMarkdownEditor
          v-if="open"
          id="review-summary-editor"
          v-model="text"
          height="100%"
          placeholder="Отредактируйте заметки…"
        />
      </div>

      <p v-if="error" :class="$style.error">{{ error }}</p>

      <div :class="$style.actions">
        <UiButton variant="secondary" type="button" :disabled="submitting" @click="requestClose">
          Отмена
        </UiButton>
        <UiButton type="button" :disabled="submitting" @click="onApprove">
          {{ submitting ? 'Одобрение…' : 'Одобрить с правками' }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { approveProposal } from '../api/pendingProposals'
import { parseApiError, useUnsavedGuard } from '@/shared/lib'
import { UiButton, UiModal } from '@/shared/ui'

const UiMarkdownEditor = defineAsyncComponent(
  () => import('@/shared/ui/UiMarkdownEditor.vue'),
)

const props = defineProps<{
  open: boolean
  proposalId: string | null
  initialText?: string
}>()

const emit = defineEmits<{
  close: []
  approved: []
}>()

const text = ref('')
const error = ref('')
const submitting = ref(false)
const openRef = ref(props.open)
const baseline = ref('')

const active = computed(() => props.open)

function serializeState() {
  return JSON.stringify({ text: text.value })
}

const dirty = computed(
  () =>
    active.value &&
    !submitting.value &&
    baseline.value !== '' &&
    serializeState() !== baseline.value,
)

function close() {
  if (submitting.value) return
  emit('close')
}

const { requestClose } = useUnsavedGuard({
  active: openRef,
  dirty,
  onClose: close,
})

watch(
  () => props.open,
  async (v) => {
    openRef.value = v
    if (v) {
      text.value = props.initialText || ''
      error.value = ''
      submitting.value = false
      baseline.value = ''
      await nextTick()
      baseline.value = serializeState()
    } else {
      baseline.value = ''
    }
  },
)

async function onApprove() {
  const id = props.proposalId
  const trimmed = text.value.trim()
  if (!id) return
  if (!trimmed) {
    error.value = 'Введите текст заметок'
    return
  }
  error.value = ''
  submitting.value = true
  try {
    await approveProposal(id, { payload: { text: trimmed } })
    emit('approved')
    emit('close')
  } catch (e: unknown) {
    error.value = parseApiError(e, 'Ошибка одобрения')
  } finally {
    submitting.value = false
  }
}
</script>

<style module>
.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
}

.editorWrap {
  display: grid;
  flex: 1;
  grid-template-rows: auto 1fr;
  gap: 0.35rem;
  min-height: 0;
}

.editorWrap :global(.md-editor) {
  min-height: 0;
  height: 100% !important;
}

.label {
  font-size: 0.88rem;
  color: var(--color-muted);
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
