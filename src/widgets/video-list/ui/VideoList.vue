<template>
  <ClientOnly>
    <VideoListInner :videos="videos" />
    <template #fallback>
      <div v-if="!slots.length">
        <UiEmptyState title="Данных пока нет" description="Видео для этого класса ещё не добавлены." />
      </div>
      <ul v-else :class="[$style.list]">
        <li
          v-for="(video, idx) in slots"
          :key="video?.id ?? `empty-${idx}`"
          :class="$style.item"
        >
          <template v-if="video">
            <div :class="$style.ph" />
            <span :class="$style.linkPh">{{
              !video.title?.trim() || /^Видео\s+\d+$/i.test(video.title.trim())
                ? `Видео ${idx + 1}`
                : video.title
            }}</span>
          </template>
          <div v-else :class="$style.ph" aria-hidden="true" />
        </li>
      </ul>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ClassVideo } from '@/entities/class'
import { UiEmptyState } from '@/shared/ui'
import VideoListInner from './VideoListInner.vue'

const props = defineProps<{
  videos: ClassVideo[]
}>()

const slots = computed((): Array<ClassVideo | null> => {
  const sorted = [...props.videos]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3)
  if (!sorted.length) return []
  return Array.from({ length: 3 }, (_, i) => sorted[i] ?? null)
})
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

.item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem;
  background: var(--color-bg-panel);
}

.ph {
  aspect-ratio: 16 / 9;
  border: 1px solid var(--color-border);
  background: #111;
}

.linkPh {
  font-size: 0.82rem;
  color: var(--color-gold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .list {
    grid-template-columns: 1fr;
  }
}
</style>
