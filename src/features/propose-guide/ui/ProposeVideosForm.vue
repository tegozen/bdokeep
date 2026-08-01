<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.trigger" @click="open = true">
      {{ triggerLabel }}
    </button>

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
          aria-label="Предложить видео"
        >
          <header :class="$style.head">
            <h3 :class="$style.title">Предложить видео</h3>
            <button type="button" :class="$style.close" aria-label="Закрыть" @click="requestClose">
              ×
            </button>
          </header>

          <form :class="$style.form" @submit.prevent="onSubmit">
            <input
              v-model="honeypot"
              type="text"
              name="website"
              autocomplete="off"
              tabindex="-1"
              :class="$style.honey"
              aria-hidden="true"
            >

            <SuperadminAuth>
              <label :class="$style.label">
                Игровой ник
                <input
                  v-model="author"
                  type="text"
                  :class="$style.input"
                  maxlength="80"
                  required
                  autocomplete="nickname"
                  placeholder="Как вас зовут в игре"
                >
              </label>
            </SuperadminAuth>

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

            <p v-if="formError" :class="$style.error">{{ formError }}</p>
            <p v-if="done" :class="$style.ok">{{ doneMessage }}</p>

            <div :class="$style.actions">
              <button type="button" :class="$style.secondary" @click="requestClose">Отмена</button>
              <button type="submit" :class="$style.primary" :disabled="submitting || done">
                {{
                  submitting ? 'Отправка…' : isSuperadmin ? 'Опубликовать' : 'Отправить'
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { ClassVideo } from '@/entities/class'
import { SuperadminAuth } from '@/features/superadmin-auth'
import { sanitizeYoutubeUrl, useSuperadmin, useUnsavedGuard, youtubeEmbedUrl } from '@/shared/lib'
import { submitGuideProposal } from '../api/submitProposal'

const MAX = 3

type Slot = { url: string }

const props = withDefaults(
  defineProps<{
    classSlug: string
    triggerLabel?: string
    initialVideos?: ClassVideo[]
  }>(),
  {
    triggerLabel: 'Предложить видео',
    initialVideos: () => [],
  },
)

const { isSuperadmin, refresh: refreshAdmin } = useSuperadmin()

const open = ref(false)
const honeypot = ref('')
const author = ref('')
const slots = reactive<Slot[]>([{ url: '' }, { url: '' }, { url: '' }])
const submitting = ref(false)
const formError = ref('')
const done = ref(false)
const doneMessage = ref('')
const baseline = ref('')

function serializeState() {
  return JSON.stringify(slots.map((s) => s.url))
}

const dirty = computed(
  () => open.value && !done.value && baseline.value !== '' && serializeState() !== baseline.value,
)

function close() {
  open.value = false
}

const { requestClose, obscured } = useUnsavedGuard({
  active: open,
  dirty,
  onClose: close,
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

function reset() {
  honeypot.value = ''
  author.value = ''
  for (let i = 0; i < MAX; i++) slots[i]!.url = ''
  formError.value = ''
  done.value = false
  doneMessage.value = ''
  submitting.value = false
}

watch(open, async (v) => {
  if (v) {
    baseline.value = ''
    formError.value = ''
    done.value = false
    hydrateFromInitial()
    await refreshAdmin()
    await nextTick()
    baseline.value = serializeState()
  } else {
    baseline.value = ''
    reset()
  }
})

async function onSubmit() {
  formError.value = ''
  if (!isSuperadmin.value && !author.value.trim()) {
    formError.value = 'Укажите игровой ник'
    return
  }
  const videos: Array<{ title: string; youtube_url: string; sort_order: number }> = []
  for (let i = 0; i < MAX; i++) {
    const raw = slots[i]!.url.trim()
    if (!raw) continue
    const safe = sanitizeYoutubeUrl(raw)
    if (!safe || !youtubeEmbedUrl(raw)) {
      formError.value = `Слот ${i + 1}: некорректная ссылка на YouTube`
      return
    }
    videos.push({
      title: `Видео ${videos.length + 1}`,
      youtube_url: safe,
      sort_order: videos.length,
    })
  }
  if (!videos.length) {
    formError.value = 'Добавьте хотя бы одну ссылку'
    return
  }

  submitting.value = true
  try {
    const res = await submitGuideProposal({
      class_slug: props.classSlug,
      section: 'videos',
      payload: { videos },
      author_label: author.value || undefined,
      website: honeypot.value || undefined,
    })
    done.value = true
    doneMessage.value = res.autoApproved
      ? 'Опубликовано.'
      : 'Отправлено на модерацию.'
    if (res.autoApproved) {
      setTimeout(() => {
        close()
        window.location.reload()
      }, 700)
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { statusMessage?: string } }).data?.statusMessage || '')
        : ''
    formError.value = msg || 'Не удалось отправить'
  } finally {
    submitting.value = false
  }
}
</script>

<style module>
.wrap {
  display: inline-flex;
}

.trigger {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-gold) 12%, transparent);
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.7rem;
}

.trigger:hover {
  background: color-mix(in srgb, var(--color-gold) 22%, transparent);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
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
  width: min(100%, 52rem);
  max-height: min(94vh, 48rem);
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
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  margin-left: auto;
}

.form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
}

.honey {
  position: absolute;
  left: -9999px;
  height: 0;
  width: 0;
  opacity: 0;
}

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

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.errorInline,
.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.ok {
  margin: 0;
  color: var(--color-gold);
  font-size: 0.88rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
}

.secondary,
.primary {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.45rem 0.85rem;
}

.primary {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
