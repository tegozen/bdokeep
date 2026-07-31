<template>
  <div v-if="!display.length">
    <UiEmptyState title="Данных пока нет" description="Видео для этого класса ещё не добавлены." />
  </div>
  <ul v-else :class="[$style.list, $style.fade]">
    <li v-for="video in display" :key="video.id" :class="$style.item">
      <div v-if="embedOf(video.youtube_url)" :class="$style.frame">
        <iframe
          :src="embedOf(video.youtube_url)!"
          :title="video.title"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          :class="$style.iframe"
        />
      </div>
      <p v-else :class="$style.bad">Некорректная ссылка</p>
      <a
        v-if="safeUrl(video.youtube_url)"
        :href="safeUrl(video.youtube_url)!"
        :class="$style.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ video.title || 'YouTube' }}
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ClassVideo } from '@/entities/class'
import { sanitizeYoutubeUrl, youtubeEmbedUrl } from '@/shared/lib'
import { UiEmptyState } from '@/shared/ui'

const props = defineProps<{
  videos: ClassVideo[]
}>()

const display = computed(() =>
  [...props.videos].sort((a, b) => a.sort_order - b.sort_order).slice(0, 3),
)

function embedOf(url: string) {
  return youtubeEmbedUrl(url)
}

function safeUrl(url: string) {
  return sanitizeYoutubeUrl(url)
}
</script>

<style module>
.list {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  list-style: none;
  gap: 1rem;
  padding: 0;
}

.fade {
  animation: fade-in 320ms ease both;
}

.item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: #000;
}

.iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
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
