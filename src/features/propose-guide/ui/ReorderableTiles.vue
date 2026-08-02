<template>
  <ol v-if="items.length" :class="$style.picked">
    <li
      v-for="(item, i) in items"
      :key="`${item.id}-${i}`"
      :class="$style.step"
    >
      <span v-if="i > 0" :class="$style.arrow" aria-hidden="true">→</span>
      <div
        :class="[
          $style.tile,
          dragFrom === i && $style.tileDragging,
          dragOver === i && dragFrom !== i && $style.tileOver,
        ]"
        draggable="true"
        :title="item.name_ru"
        @dragstart="emit('dragstart', i, $event)"
        @dragend="emit('dragend')"
        @dragover.prevent="emit('dragover', i)"
        @drop.prevent="emit('drop', i)"
      >
        <img
          v-if="item.icon_url"
          :src="codexIconSrc(item.icon_url) || item.icon_url"
          alt=""
          :class="$style.tileIcon"
          draggable="false"
          loading="lazy"
        >
        <span v-else :class="$style.tileFallback">?</span>
        <span :class="$style.tileName">{{ item.name_ru }}</span>
        <button
          type="button"
          :class="$style.tileRemove"
          :aria-label="`Убрать ${item.name_ru}`"
          @click.stop="emit('remove', i)"
          @mousedown.stop
        >
          ✕
        </button>
      </div>
    </li>
  </ol>
  <p v-else :class="$style.muted">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import { codexIconSrc } from '@/shared/lib'

withDefaults(
  defineProps<{
    items: ReadonlyArray<{ id: string; name_ru: string; icon_url?: string | null }>
    dragFrom: number | null
    dragOver: number | null
    emptyText?: string
  }>(),
  {
    emptyText: 'Пока пусто',
  },
)

const emit = defineEmits<{
  dragstart: [index: number, event: DragEvent]
  dragend: []
  dragover: [index: number]
  drop: [index: number]
  remove: [index: number]
}>()
</script>

<style module>
.picked {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.35rem 0.2rem;
  list-style: none;
  padding: 0;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.arrow {
  margin: 0 0.1rem;
  color: var(--color-gold-soft);
  font-size: 0.95rem;
  align-self: center;
}

.tile {
  position: relative;
  display: flex;
  width: 4.5rem;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: grab;
  padding: 0.4rem 0.3rem 0.35rem;
  user-select: none;
  touch-action: none;
}

.tile:active {
  cursor: grabbing;
}

.tileDragging {
  opacity: 0.45;
}

.tileOver {
  border-color: var(--color-border-strong);
  box-shadow: inset 0 0 0 1px var(--color-gold-soft);
}

.tileIcon {
  width: 2.75rem;
  height: 2.75rem;
  background: #000;
  object-fit: contain;
  pointer-events: none;
}

.tileFallback {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  background: #000;
  color: var(--color-muted);
}

.tileName {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--color-ink);
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
}

.tileRemove {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  border: 0;
  background: rgba(0, 0, 0, 0.65);
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.15rem 0.25rem;
}

.tileRemove:hover {
  color: var(--color-danger);
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}
</style>
