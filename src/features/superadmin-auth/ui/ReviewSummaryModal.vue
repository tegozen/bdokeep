<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="[$style.backdrop, obscured && $style.obscured]"
      @click.self="requestClose"
    >
      <div
        :class="$style.modal"
        role="dialog"
        aria-modal="true"
        aria-label="Редактировать суть перед одобрением"
      >
        <header :class="$style.head">
          <h3 :class="$style.title">Редактировать суть</h3>
          <button type="button" :class="$style.close" aria-label="Закрыть" @click="requestClose">
            ×
          </button>
        </header>

        <div :class="$style.body">
          <div :class="$style.editorWrap">
            <span :class="$style.label">Markdown</span>
            <UiMarkdownEditor
              id="review-summary-editor"
              v-model="text"
              height="100%"
              placeholder="Отредактируйте суть…"
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
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { approveProposal } from '../api/pendingProposals'
import { useUnsavedGuard } from '@/shared/lib'
import { UiButton, UiMarkdownEditor } from '@/shared/ui'

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

const { requestClose, obscured } = useUnsavedGuard({
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
    error.value = 'Введите текст сути'
    return
  }
  error.value = ''
  submitting.value = true
  try {
    await approveProposal(id, { payload: { text: trimmed } })
    emit('approved')
    emit('close')
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    error.value = msg || 'Ошибка одобрения'
  } finally {
    submitting.value = false
  }
}
</script>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  justify-items: center;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.45);
  padding: 1rem;
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  transition: filter 160ms ease;
}

.obscured {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.modal {
  display: flex;
  flex-direction: column;
  width: var(--summary-edit-modal-width);
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  padding: 0.85rem 1rem;
}

.title {
  margin: 0;
  font-size: 1.05rem;
}

.close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

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
