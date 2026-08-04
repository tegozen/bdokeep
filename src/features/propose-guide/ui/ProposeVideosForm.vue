<template>
  <ProposeModalShell
    v-model:open="open"
    v-model:honeypot="honeypot"
    v-model:author="author"
    title="Предложить видео"
    :trigger-label="triggerLabel"
    :submitting="submitting"
    :form-error="formError"
    :obscured="obscured"
    :is-superadmin="isSuperadmin"
    :request-close="requestClose"
    @submit="onSubmit"
  >
    <p :class="$style.hint">До 3 ссылок на YouTube. Пустые слоты не сохранятся.</p>

    <div :class="$style.slots">
      <label
        v-for="(slot, i) in slots"
        :key="i"
        :class="[$style.slot, slotErrors[i] && $style.slotInvalid]"
      >
        <span :class="$style.slotLabel">Видео {{ i + 1 }}</span>
        <input
          v-model="slot.url"
          type="url"
          :class="[$style.input, slotErrors[i] && $style.inputInvalid]"
          :aria-invalid="Boolean(slotErrors[i])"
          :aria-describedby="slotErrors[i] ? `video-slot-err-${i}` : undefined"
          placeholder="https://www.youtube.com/watch?v=…"
          maxlength="500"
          @input="clearSlotError(i)"
        >
        <p
          v-if="slotErrors[i]"
          :id="`video-slot-err-${i}`"
          :class="$style.errorInline"
        >
          {{ slotErrors[i] }}
        </p>
      </label>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ClassVideo, ProposalSection } from '@/entities/class'
import { sanitizeYoutubeUrl, youtubeVideoId } from '@/shared/lib'
import { submitGuideProposal } from '../api/submitProposal'
import { parseSubmitError } from '../lib/parseSubmitError'
import { useProposeModal } from '../lib/useProposeModal'
import ProposeModalShell from './ProposeModalShell.vue'

const MAX = 3

type Slot = { url: string }

const props = withDefaults(
  defineProps<{
    classSlug: string
    section?: Extract<ProposalSection, 'videos_awakening' | 'videos_succession'>
    triggerLabel?: string
    initialVideos?: ClassVideo[]
  }>(),
  {
    section: 'videos_awakening',
    triggerLabel: 'Предложить',
    initialVideos: () => [],
  },
)

const slots = reactive<Slot[]>([{ url: '' }, { url: '' }, { url: '' }])
const slotErrors = reactive<string[]>(['', '', ''])

const {
  open,
  honeypot,
  author,
  submitting,
  formError,
  obscured,
  requestClose,
  isSuperadmin,
  openModal,
  runSubmit,
} = useProposeModal({
  classSlug: () => props.classSlug,
  serialize: () => JSON.stringify(slots.map((s) => s.url)),
  onOpen: () => {
    hydrateFromInitial()
    clearAllSlotErrors()
  },
  onReset: () => {
    for (let i = 0; i < MAX; i++) slots[i]!.url = ''
    clearAllSlotErrors()
  },
})

defineExpose({ openModal })

function clearSlotError(i: number) {
  slotErrors[i] = ''
}

function clearAllSlotErrors() {
  for (let i = 0; i < MAX; i++) slotErrors[i] = ''
}

function hydrateFromInitial() {
  for (let i = 0; i < MAX; i++) slots[i]!.url = ''
  const sorted = [...(props.initialVideos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < Math.min(MAX, sorted.length); i++) {
    slots[i]!.url = sorted[i]!.youtube_url
  }
}

function applyFieldErrorFromMessage(msg: string): boolean {
  const m = /^Видео\s+(\d+)\s*:\s*(.+)$/i.exec(msg.trim())
  if (!m) return false
  const idx = Number(m[1]) - 1
  if (!Number.isInteger(idx) || idx < 0 || idx >= MAX) return false
  slotErrors[idx] = m[2]!.trim() || 'Ошибка'
  return true
}

async function onSubmit() {
  clearAllSlotErrors()
  await runSubmit(async () => {
    const videos: Array<{ title: string; youtube_url: string; sort_order: number }> = []
    for (let i = 0; i < MAX; i++) {
      const raw = slots[i]!.url.trim()
      if (!raw) continue
      const safe = sanitizeYoutubeUrl(raw)
      if (!safe || !youtubeVideoId(raw)) {
        slotErrors[i] = 'Некорректная ссылка'
        return null
      }
      const order = videos.length
      videos.push({
        // Server resolves real YouTube title via oEmbed when empty/placeholder.
        title: '',
        youtube_url: safe,
        sort_order: order,
      })
    }
    if (!videos.length) {
      formError.value = 'Добавьте хотя бы одну ссылку'
      return null
    }
    try {
      return await submitGuideProposal({
        class_slug: props.classSlug,
        section: props.section,
        payload: { videos },
        author_label: author.value || undefined,
        website: honeypot.value || undefined,
      })
    } catch (e: unknown) {
      if (applyFieldErrorFromMessage(parseSubmitError(e))) return null
      throw e
    }
  })
}
</script>

<style module>
.hint {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-muted);
}

.slots {
  display: grid;
  gap: 1rem;
}

.slot {
  display: grid;
  gap: 0.35rem;
}

.slotLabel {
  font-size: 0.85rem;
  color: var(--color-muted);
  transition: color 120ms ease;
}

.slotInvalid .slotLabel {
  color: var(--color-danger);
}

.input {
  box-sizing: border-box;
  min-height: 2rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  line-height: 1;
  padding: 0 0.65rem;
  border-radius: 2px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--color-gold) 70%, var(--color-border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-gold) 35%, transparent);
}

.inputInvalid {
  border-color: var(--color-danger);
}

.inputInvalid:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-danger) 45%, transparent);
}

.errorInline {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.78rem;
  line-height: 1.35;
}
</style>
