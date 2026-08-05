<template>
  <ol v-if="items.length" :class="$style.list">
    <template v-for="(item, i) in items" :key="item.kind === 'divider' ? item.key : `${item.id}-${i}`">
      <li :class="[$style.row, item.kind === 'divider' && $style.rowDivider]">
        <span
          v-if="i > 0 && item.kind === 'skill' && items[i - 1]?.kind === 'skill'"
          :class="$style.arrow"
          aria-hidden="true"
        >→</span>

        <div
          v-if="item.kind === 'skill'"
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

        <div
          v-else
          :class="[
            $style.divider,
            dragFrom === i && $style.tileDragging,
            dragOver === i && dragFrom !== i && $style.tileOver,
          ]"
          draggable="true"
          @dragstart="emit('dragstart', i, $event)"
          @dragend="emit('dragend')"
          @dragover.prevent="emit('dragover', i)"
          @drop.prevent="emit('drop', i)"
        >
          <div :class="$style.dividerHead">
            <span :class="$style.dividerLabel">Комба</span>
            <button
              v-if="canRemoveDivider(i)"
              type="button"
              :class="$style.tileRemove"
              aria-label="Убрать делитель"
              @click.stop="emit('remove', i)"
              @mousedown.stop
            >
              ✕
            </button>
          </div>
          <label :class="$style.field">
            <span :class="$style.fieldLabel">Заметка</span>
            <input
              :value="item.notes"
              type="text"
              maxlength="500"
              placeholder="Кратко, зачем эта комба"
              :class="$style.input"
              @mousedown.stop
              @input="emit('updateDivider', i, ($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
      </li>

      <!-- Empty slot so a new combo segment is visible before skills are added -->
      <li
        v-if="item.kind === 'divider' && items[i + 1]?.kind !== 'skill'"
        :key="`${item.key}-slot`"
        :class="$style.row"
      >
        <div :class="$style.emptySlot" aria-hidden="true">
          <span :class="$style.emptySlotIcon" />
          <span :class="$style.emptySlotHint">скилл</span>
        </div>
      </li>
    </template>
  </ol>
  <p v-else :class="$style.muted">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import type { ComboEditorItem } from '@bdokeep/domain'
import { codexIconSrc } from '@/shared/lib'

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<ComboEditorItem & { name_ru?: string; icon_url?: string | null }>
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
  updateDivider: [index: number, notes: string]
}>()

/** Keep at least one leading plaque — first divider is not removable. */
function canRemoveDivider(index: number) {
  const firstDivider = props.items.findIndex((it) => it.kind === 'divider')
  return index !== firstDivider
}
</script>

<style module>
.list {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.45rem 0.25rem;
  list-style: none;
  padding: 0;
}

.row {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.rowDivider {
  flex: 1 1 100%;
  width: 100%;
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

.divider {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px dashed var(--color-border-strong);
  background: color-mix(in srgb, var(--color-gold-soft) 8%, var(--color-bg));
  cursor: grab;
  padding: 0.55rem 0.65rem 0.6rem;
  user-select: none;
}

.divider:active {
  cursor: grabbing;
}

.dividerHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-right: 1.5rem;
}

.dividerLabel {
  color: var(--color-gold-soft);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.fieldLabel {
  color: var(--color-muted);
  font-size: 0.72rem;
}

.input {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  font-size: 0.88rem;
  padding: 0.35rem 0.45rem;
}

.input:focus {
  outline: 1px solid var(--color-gold-soft);
}

.emptySlot {
  display: flex;
  width: 4.5rem;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 1px dashed var(--color-border);
  background: transparent;
  opacity: 0.7;
  padding: 0.4rem 0.3rem 0.35rem;
  pointer-events: none;
}

.emptySlotIcon {
  display: block;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px dashed var(--color-border-strong);
  background: color-mix(in srgb, var(--color-muted) 12%, var(--color-bg));
}

.emptySlotHint {
  color: var(--color-muted);
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}
</style>
