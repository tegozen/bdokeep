<template>
  <div v-if="!watchUrl" :class="$style.bad">Некорректная ссылка</div>
  <div v-else-if="processing" :class="$style.frame">
    <div :class="$style.pending" role="status">
      <p :class="$style.pendingTitle">Видео обрабатывается</p>
      <p :class="$style.pendingHint">Появится после обработки на YouTube</p>
      <a
        :href="watchUrl"
        :class="$style.pendingLink"
        target="_blank"
        rel="noopener noreferrer"
      >
        Открыть на YouTube
      </a>
    </div>
  </div>
  <div v-else :class="$style.frame">
    <iframe
      v-if="playSrc"
      :src="playSrc"
      :title="title"
      :allow="YOUTUBE_IFRAME_ALLOW"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      :class="$style.iframe"
    />
    <a
      v-else-if="external"
      :href="watchUrl"
      :class="$style.facade"
      :aria-label="`Смотреть на YouTube: ${title}`"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        v-if="thumb"
        :src="thumb"
        alt=""
        loading="lazy"
        decoding="async"
        :class="$style.thumb"
      >
      <span :class="$style.play" aria-hidden="true" />
    </a>
    <button
      v-else
      type="button"
      :class="$style.facade"
      :aria-label="`Смотреть: ${title}`"
      @click="play"
    >
      <img
        v-if="thumb"
        :src="thumb"
        alt=""
        loading="lazy"
        decoding="async"
        :class="$style.thumb"
      >
      <span :class="$style.play" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  sanitizeYoutubeUrl,
  youtubeEmbedUrl,
  youtubeThumbProxyUrl,
  YOUTUBE_IFRAME_ALLOW,
} from '@/shared/lib'

const props = withDefaults(
  defineProps<{
    url: string
    title?: string
    /** Load iframe immediately (e.g. propose modal preview). */
    eager?: boolean
    /** Open YouTube in a new tab instead of embedding (class page). */
    external?: boolean
    /** Awaiting YouTube processing / thumbnail. */
    processing?: boolean
  }>(),
  {
    title: 'YouTube',
    eager: false,
    external: false,
    processing: false,
  },
)

const playing = ref(props.eager && !props.external && !props.processing)

const watchUrl = computed(() => sanitizeYoutubeUrl(props.url))
const embed = computed(() => (props.processing ? null : youtubeEmbedUrl(props.url)))
const thumb = computed(() =>
  props.processing ? null : youtubeThumbProxyUrl(props.url),
)

const playSrc = computed(() => {
  if (props.external || props.processing) return null
  const base = embed.value
  if (!base || !playing.value) return null
  if (props.eager) return base
  const join = base.includes('?') ? '&' : '?'
  return `${base}${join}autoplay=1`
})

function play() {
  if (!embed.value) return
  playing.value = true
}

watch(
  () => [props.url, props.eager, props.external, props.processing] as const,
  ([, eager, external, processing]) => {
    playing.value = Boolean(eager) && !external && !processing
  },
)
</script>

<style module>
.frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: #0a0a0a;
}

.iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.facade {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  cursor: pointer;
  background: #0a0a0a;
  text-decoration: none;
  color: inherit;
}

.thumb {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play {
  position: relative;
  z-index: 1;
  width: 4rem;
  height: 2.75rem;
  border-radius: 0.65rem;
  background: color-mix(in srgb, #f00 88%, #000);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
}

.play::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 54%;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0.55rem 0 0.55rem 0.9rem;
  border-color: transparent transparent transparent #fff;
  transform: translate(-50%, -50%);
}

.facade:hover .play,
.facade:focus-visible .play {
  background: #f00;
}

.pending {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.75rem;
  text-align: center;
  background: radial-gradient(ellipse at 50% 40%, #1a1a22 0%, #0a0a0a 70%);
}

.pendingTitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text, #e8e8ec);
}

.pendingHint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-muted, #9a9aa3);
}

.pendingLink {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--color-gold);
  text-decoration: none;
}

.pendingLink:hover {
  text-decoration: underline;
}

.bad {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  color: var(--color-danger);
  font-size: 0.85rem;
}
</style>
