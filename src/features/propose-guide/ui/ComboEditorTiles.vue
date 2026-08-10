<template>
  <div v-if="segments.length" :class="$style.list">
    <div
      v-for="seg in segments"
      :key="seg.divider.key"
      :data-combo-key="seg.divider.key"
      :class="[
        $style.comboCard,
        dragFrom === seg.dividerIndex && $style.tileDragging,
        dragOver === seg.dividerIndex && dragFrom !== seg.dividerIndex && $style.tileOver,
      ]"
    >
      <div
        :class="$style.dividerHead"
        draggable="true"
        @dragstart="emit('dragstart', seg.dividerIndex, $event)"
        @dragend="emit('dragend')"
        @dragover.prevent="emit('dragover', seg.dividerIndex)"
        @drop.prevent="emit('drop', seg.dividerIndex)"
      >
        <span :class="$style.dividerLabel">Комба</span>
        <input
          :value="seg.divider.notes"
          type="text"
          maxlength="500"
          required
          placeholder="Кратко, зачем эта комба"
          aria-label="Заметка"
          :class="$style.input"
          @mousedown.stop
          @input="emit('updateDivider', seg.dividerIndex, ($event.target as HTMLInputElement).value)"
        >
        <button
          v-if="canRemoveDivider(seg.dividerIndex)"
          type="button"
          :class="$style.headRemove"
          aria-label="Убрать комбу"
          @click.stop="emit('remove', seg.dividerIndex)"
          @mousedown.stop
        >
          ✕
        </button>
      </div>

      <ol :class="$style.chain">
        <li
          v-for="(si, sIdx) in seg.skillIndices"
          :key="`${skillAt(si)?.id ?? 'x'}-${si}`"
          :class="$style.row"
        >
          <span
            v-if="sIdx > 0"
            :class="$style.arrow"
            aria-hidden="true"
          >→</span>
          <div
            v-if="skillAt(si)"
            :class="[
              $style.tile,
              dragFrom === si && $style.tileDragging,
              dragOver === si && dragFrom !== si && $style.tileOver,
            ]"
            draggable="true"
            :title="skillAt(si)!.name_ru || 'Скилл'"
            @dragstart="emit('dragstart', si, $event)"
            @dragend="emit('dragend')"
            @dragover.prevent="emit('dragover', si)"
            @drop.prevent="emit('drop', si)"
          >
            <img
              v-if="skillAt(si)!.icon_url"
              :src="codexIconSrc(skillAt(si)!.icon_url) || skillAt(si)!.icon_url || undefined"
              alt=""
              :class="$style.tileIcon"
              draggable="false"
              loading="lazy"
            >
            <span v-else :class="$style.tileFallback">?</span>
            <span :class="$style.tileName">{{ skillAt(si)!.name_ru || 'Скилл' }}</span>
            <button
              type="button"
              :class="$style.tileRemove"
              :aria-label="`Убрать ${skillAt(si)!.name_ru || 'скилл'}`"
              @click.stop="emit('remove', si)"
              @mousedown.stop
            >
              ✕
            </button>
          </div>
        </li>

        <li
          v-if="!seg.skillIndices.length"
          :class="$style.row"
        >
          <div :class="$style.emptySlot" aria-hidden="true">
            <span :class="$style.emptySlotIcon" />
            <span :class="$style.emptySlotHint">скилл</span>
          </div>
        </li>
      </ol>
    </div>
  </div>
  <p v-else :class="$style.muted">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComboEditorDivider, ComboEditorItem, ComboEditorSkill } from '@domain'
import { codexIconSrc } from '@/shared/lib'

type EditorItem = ComboEditorItem & Partial<Pick<ComboEditorSkill, 'name_ru' | 'icon_url'>>

type ComboSegment = {
  dividerIndex: number
  divider: ComboEditorDivider
  skillIndices: number[]
}

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<EditorItem>
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

const segments = computed((): ComboSegment[] => {
  const out: ComboSegment[] = []
  let current: ComboSegment | null = null
  props.items.forEach((item, i) => {
    if (item.kind === 'divider') {
      current = {
        dividerIndex: i,
        divider: item,
        skillIndices: [],
      }
      out.push(current)
      return
    }
    if (!current) return
    current.skillIndices.push(i)
  })
  return out
})

function skillAt(index: number): EditorItem & { kind: 'skill' } | null {
  const item = props.items[index]
  return item?.kind === 'skill' ? item : null
}

/** Keep at least one leading plaque — first divider is not removable. */
function canRemoveDivider(index: number) {
  const firstDivider = props.items.findIndex((it) => it.kind === 'divider')
  return index !== firstDivider
}
</script>

<style module>
.list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comboCard {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  border: 1px solid var(--color-border-strong);
  background: color-mix(in srgb, var(--color-gold-soft) 6%, var(--color-bg));
  padding: 0.55rem 0.65rem 0.65rem;
}

.tileDragging {
  opacity: 0.45;
}

.tileOver {
  box-shadow: inset 0 0 0 1px var(--color-gold-soft);
}

.dividerHead {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: grab;
  user-select: none;
}

.dividerHead:active {
  cursor: grabbing;
}

.dividerLabel {
  flex-shrink: 0;
  color: var(--color-gold-soft);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.input {
  flex: 1 1 auto;
  min-width: 0;
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

.headRemove {
  flex-shrink: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.65);
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.15rem 0.25rem;
}

.headRemove:hover {
  color: var(--color-danger);
}

.chain {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.45rem 0.25rem;
  list-style: none;
  padding: 0;
  min-width: 0;
}

.row {
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
