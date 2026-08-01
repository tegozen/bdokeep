<template>
  <div v-if="!display.length">
    <UiEmptyState title="Данных пока нет" description="Видео для этого класса ещё не добавлены." />
  </div>
  <ul v-else :class="[$style.list, $style.fade]">
    <li v-for="(video, idx) in display" :key="video.id" :class="$style.item">
      <YoutubeEmbed
        v-if="safeUrl(video.youtube_url)"
        :url="safeUrl(video.youtube_url)!"
        :title="labelFor(video, idx)"
        external
      />
      <p v-else :class="$style.bad">Некорректная ссылка</p>
      <a
        v-if="safeUrl(video.youtube_url)"
        :href="safeUrl(video.youtube_url)!"
        :class="$style.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ labelFor(video, idx) }}
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ClassVideo } from '@/entities/class'
import { sanitizeYoutubeUrl } from '@/shared/lib'
import { UiEmptyState, YoutubeEmbed } from '@/shared/ui'

const props = defineProps<{
  videos: ClassVideo[]
}>()

const display = computed(() =>
  [...props.videos].sort((a, b) => a.sort_order - b.sort_order).slice(0, 3),
)

function safeUrl(url: string) {
  return sanitizeYoutubeUrl(url)
}

/** Default "Видео N" titles follow display order (empty form slots are compacted). */
function labelFor(video: ClassVideo, idx: number) {
  const t = video.title?.trim()
  if (!t || /^Видео\s+\d+$/i.test(t)) return `Видео ${idx + 1}`
  return t
}
</script>

<style module>
.list {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  gap: 1px;
  padding: 0;
  background: var(--color-border);
  border: 1px solid var(--color-border);
}

.fade {
  animation: fade-in 320ms ease both;
}

.item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem;
  background: var(--color-bg-panel);
}

.link {
  font-size: 0.82rem;
  color: var(--color-gold);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link:hover {
  text-decoration: underline;
}

.bad {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  color: var(--color-danger);
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .list {
    grid-template-columns: 1fr;
  }
}
</style>
