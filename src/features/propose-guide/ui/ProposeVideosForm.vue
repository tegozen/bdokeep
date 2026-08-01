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
    size="lg"
    @submit="onSubmit"
  >
    <p :class="$style.hint">До 3 ссылок на YouTube. Пустые слоты не сохранятся.</p>

    <div :class="$style.slots">
      <label v-for="(slot, i) in slots" :key="i" :class="$style.slot">
        <span :class="$style.slotLabel">Видео {{ i + 1 }}</span>
        <input
          v-model="slot.url"
          type="url"
          :class="$style.input"
          placeholder="https://www.youtube.com/watch?v=…"
          maxlength="500"
        >
        <div v-if="embedOf(slot.url)" :class="$style.preview">
          <iframe
            :src="embedOf(slot.url)!"
            :title="`Превью ${i + 1}`"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
            :class="$style.iframe"
          />
        </div>
        <p v-else-if="slot.url.trim()" :class="$style.errorInline">
          Некорректная ссылка
        </p>
      </label>
    </div>
  </ProposeModalShell>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ClassVideo } from '@/entities/class'
import { sanitizeYoutubeUrl, youtubeEmbedUrl } from '@/shared/lib'
import { submitGuideProposal } from '../api/submitProposal'
import { useProposeModal } from '../lib/useProposeModal'
import ProposeModalShell from './ProposeModalShell.vue'

const MAX = 3

type Slot = { url: string }

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
    initialVideos?: ClassVideo[]
  }>(),
  {
    triggerLabel: 'Предложить',
    initialVideos: () => [],
  },
)

const slots = reactive<Slot[]>([{ url: '' }, { url: '' }, { url: '' }])

const {
  open,
  honeypot,
  author,
  submitting,
  formError,
  obscured,
  requestClose,
  isSuperadmin,
  runSubmit,
} = useProposeModal({
  classSlug: () => props.classSlug,
  serialize: () => JSON.stringify(slots.map((s) => s.url)),
  onOpen: () => {
    hydrateFromInitial()
  },
  onReset: () => {
    for (let i = 0; i < MAX; i++) slots[i]!.url = ''
  },
})

function embedOf(url: string) {
  return youtubeEmbedUrl(url)
}

function hydrateFromInitial() {
  for (let i = 0; i < MAX; i++) slots[i]!.url = ''
  const sorted = [...(props.initialVideos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < Math.min(MAX, sorted.length); i++) {
    slots[i]!.url = sorted[i]!.youtube_url
  }
}

async function onSubmit() {
  await runSubmit(async () => {
    const videos: Array<{ title: string; youtube_url: string; sort_order: number }> = []
    for (let i = 0; i < MAX; i++) {
      const raw = slots[i]!.url.trim()
      if (!raw) continue
      const safe = sanitizeYoutubeUrl(raw)
      if (!safe || !youtubeEmbedUrl(raw)) {
        formError.value = `Слот ${i + 1}: некорректная ссылка на YouTube`
        return null
      }
      videos.push({
        title: `Видео ${videos.length + 1}`,
        youtube_url: safe,
        sort_order: videos.length,
      })
    }
    if (!videos.length) {
      formError.value = 'Добавьте хотя бы одну ссылку'
      return null
    }
    return submitGuideProposal({
      class_slug: props.classSlug,
      section: 'videos',
      payload: { videos },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
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
  gap: 0.4rem;
}

.slotLabel {
  font-size: 0.85rem;
  color: var(--color-muted);
}

.input {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  padding: 0.45rem 0.6rem;
}

.preview {
  position: relative;
  aspect-ratio: 16 / 9;
  max-width: 22rem;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--color-border);
}

.iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.errorInline {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.85rem;
}
</style>
