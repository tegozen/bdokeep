<template>
  <div v-if="!videos.length">
    <UiEmptyState title="Данных пока нет" description="Видео для этого класса ещё не добавлены." />
  </div>
  <ul v-else :class="[$style.list, $style.fade]">
    <li v-for="video in videos" :key="video.id" :class="$style.item">
      <h3 :class="$style.title">{{ video.title }}</h3>
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
      <p v-else :class="$style.bad">Некорректная ссылка на YouTube</p>
      <a
        v-if="safeUrl(video.youtube_url)"
        :href="safeUrl(video.youtube_url)!"
        :class="$style.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Открыть на YouTube
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { ClassVideo } from '@/entities/class'
import { sanitizeYoutubeUrl, youtubeEmbedUrl } from '@/shared/lib'
import { UiEmptyState } from '@/shared/ui'

defineProps<{
  videos: ClassVideo[]
}>()

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
  list-style: none;
  gap: 1.5rem;
  padding: 0;
}

.fade {
  animation: fade-in 320ms ease both;
}

.item {
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 1rem;
}

.title {
  margin-bottom: 0.75rem;
  font-size: 1.05rem;
  color: var(--color-ink);
}

.frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
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
  margin-top: 0.75rem;
  display: inline-block;
  font-size: 0.875rem;
}

.bad {
  margin: 0;
  color: var(--color-danger);
}
</style>
