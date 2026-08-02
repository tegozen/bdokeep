<template>
  <div
    :class="[$style.wrap, interactive && $style.interactive, fill && $style.fill]"
    :style="fillStyle"
  >
    <div :class="$style.stack">
      <div :class="$style.canvas">
        <div :class="$style.sigil" aria-hidden="true" />
        <div :class="$style.board" role="list">
          <button
            v-for="slot in boardSlots"
            :key="slot.id"
            type="button"
            role="listitem"
            :class="[
              $style.cell,
              $style[`kind_${slot.kind}`],
              selectedId === slot.id && $style.selected,
              filled[slot.id] && $style.filled,
            ]"
            :style="{ gridRow: slot.row!, gridColumn: slot.col! }"
            :disabled="!interactive"
            :title="filled[slot.id]?.name_ru || slot.label"
            :aria-label="filled[slot.id]?.name_ru || `Слот ${slot.label}`"
            @click="onSlotClick(slot.id)"
          >
            <img
              v-if="filled[slot.id]?.icon_url"
              :src="codexIconSrc(filled[slot.id]!.icon_url) || undefined"
              alt=""
              :class="$style.icon"
              draggable="false"
              loading="lazy"
            >
            <span
              v-if="interactive && filled[slot.id]"
              :class="$style.clear"
              role="presentation"
              aria-hidden="true"
              title="Очистить"
              @click.stop="onClear(slot.id)"
            >×</span>
            <span v-else-if="interactive" :class="$style.plus">+</span>
          </button>
        </div>
      </div>

      <div :class="$style.dawnCanvas" role="list" aria-label="Слоты рассвета">
        <button
          v-for="slot in dawnSlots"
          :key="slot.id"
          type="button"
          role="listitem"
          :class="[
            $style.cell,
            $style.kind_dawn,
            selectedId === slot.id && $style.selected,
            filled[slot.id] && $style.filled,
          ]"
          :disabled="!interactive"
          :title="filled[slot.id]?.name_ru || slot.label"
          :aria-label="filled[slot.id]?.name_ru || slot.label"
          @click="onSlotClick(slot.id)"
        >
          <img
            v-if="filled[slot.id]?.icon_url"
            :src="codexIconSrc(filled[slot.id]!.icon_url) || undefined"
            alt=""
            :class="$style.icon"
            draggable="false"
            loading="lazy"
          >
          <span
            v-if="interactive && filled[slot.id]"
            :class="$style.clear"
            role="presentation"
            aria-hidden="true"
            title="Очистить"
            @click.stop="onClear(slot.id)"
          >×</span>
          <span v-else-if="interactive" :class="$style.plus">+</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { codexIconSrc } from '@/shared/lib/codexIcon'
import {
  CRYSTAL_BOARD_SLOTS,
  CRYSTAL_DAWN_SLOTS,
} from '@/shared/lib/crystalSlots'

export type CrystalFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

const props = withDefaults(
  defineProps<{
    /** slotId → crystal item */
    filled?: Record<string, CrystalFill | null | undefined>
    selectedId?: string | null
    interactive?: boolean
    /** Stretch board to a fixed pixel width (propose modal). */
    fill?: boolean
    /** Board canvas width in px when `fill` is on. */
    fillWidth?: number | null
  }>(),
  {
    filled: () => ({}),
    selectedId: null,
    interactive: false,
    fill: false,
    fillWidth: null,
  },
)

const emit = defineEmits<{
  select: [slotId: string]
  clear: [slotId: string]
}>()

const boardSlots = CRYSTAL_BOARD_SLOTS
const dawnSlots = CRYSTAL_DAWN_SLOTS

const fillStyle = computed(() => {
  if (!props.fill || !props.fillWidth) return undefined
  return {
    width: `${props.fillWidth}px`,
    '--crystal-fill-width': `${props.fillWidth}px`,
  }
})

function onSlotClick(id: string) {
  if (!props.interactive) return
  emit('select', id)
}

function onClear(id: string) {
  if (!props.interactive) return
  emit('clear', id)
}
</script>

<style module>
.wrap {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: max-content max-content;
  align-content: start;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.fill {
  width: var(--crystal-fill-width, 100%);
  max-width: none;
}

.canvas {
  position: relative;
  aspect-ratio: 1 / 1;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(201, 168, 76, 0.28);
  background:
    radial-gradient(ellipse at 50% 42%, rgba(40, 55, 95, 0.55), transparent 60%),
    linear-gradient(180deg, #0c1018 0%, #07090e 100%);
  overflow: hidden;
  isolation: isolate;
}

.sigil {
  position: absolute;
  inset: 8% 10% 12%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
  background:
    radial-gradient(circle at 50% 48%, rgba(120, 170, 255, 0.12), transparent 42%),
    radial-gradient(circle at 50% 48%, transparent 28%, rgba(180, 210, 255, 0.08) 29%, transparent 31%),
    radial-gradient(circle at 50% 48%, transparent 38%, rgba(180, 210, 255, 0.07) 39%, transparent 41%);
  mask-image: radial-gradient(circle at 50% 48%, #000 0%, #000 55%, transparent 72%);
}

.sigil::before {
  content: '';
  position: absolute;
  inset: 16%;
  border: 1px solid rgba(190, 215, 255, 0.16);
  border-radius: 50%;
  box-shadow: inset 0 0 20px rgba(80, 120, 200, 0.1);
}

.board {
  position: absolute;
  inset: 7%;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 3.2%;
}

.dawnCanvas {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.45rem;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: max-content;
  padding: 0.55rem;
  border: 1px solid rgba(201, 168, 76, 0.28);
  background:
    radial-gradient(ellipse at 50% 50%, rgba(40, 55, 95, 0.35), transparent 70%),
    linear-gradient(180deg, #0c1018 0%, #07090e 100%);
  overflow: visible;
}

.dawnCanvas .cell {
  aspect-ratio: 1 / 1;
  width: 100%;
  height: auto;
  max-height: none;
  align-self: start;
}

.cell {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(201, 168, 76, 0.55);
  background: linear-gradient(145deg, rgba(28, 32, 42, 0.92), rgba(10, 12, 18, 0.96));
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(0, 0, 0, 0.25);
  color: var(--color-muted);
  padding: 0;
  cursor: default;
}

.interactive .cell {
  cursor: pointer;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    transform 140ms ease;
}

.interactive .cell:hover:not(:disabled) {
  border-color: rgba(232, 201, 112, 0.95);
  box-shadow:
    inset 0 0 0 1px rgba(232, 201, 112, 0.2),
    0 0 12px rgba(201, 168, 76, 0.25);
  transform: translateY(-1px);
}

.kind_ornate,
.kind_dawn {
  border-color: rgba(220, 185, 90, 0.78);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(140, 110, 40, 0.35);
}

.kind_ornate::before,
.kind_dawn::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(201, 168, 76, 0.35);
  pointer-events: none;
  box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.12);
}

.kind_center {
  border-color: rgba(232, 201, 112, 0.9);
  box-shadow:
    inset 0 0 0 1px rgba(232, 201, 112, 0.15),
    0 0 14px rgba(201, 168, 76, 0.28);
}

.kind_center::after {
  content: '';
  position: absolute;
  inset: -3px;
  pointer-events: none;
  background:
    linear-gradient(rgba(232, 201, 112, 0.7), rgba(232, 201, 112, 0.7)) center top / 2px 4px no-repeat,
    linear-gradient(rgba(232, 201, 112, 0.7), rgba(232, 201, 112, 0.7)) center bottom / 2px 4px no-repeat,
    linear-gradient(rgba(232, 201, 112, 0.7), rgba(232, 201, 112, 0.7)) left center / 4px 2px no-repeat,
    linear-gradient(rgba(232, 201, 112, 0.7), rgba(232, 201, 112, 0.7)) right center / 4px 2px no-repeat;
}

.selected {
  border-color: #f0d78a !important;
  box-shadow:
    inset 0 0 0 1px rgba(240, 215, 138, 0.35),
    0 0 16px rgba(240, 215, 138, 0.35) !important;
  z-index: 2;
}

.filled {
  background: #050608;
}

.icon {
  width: 78%;
  height: 78%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 0 4px rgba(120, 160, 255, 0.25));
}

.plus {
  font-size: clamp(0.75rem, 28%, 1.35rem);
  line-height: 1;
  color: rgba(201, 168, 76, 0.55);
}

.clear {
  position: absolute;
  top: 2%;
  right: 2%;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 28%;
  height: 28%;
  min-width: 1.1rem;
  min-height: 1.1rem;
  max-width: 1.75rem;
  max-height: 1.75rem;
  border: 0;
  border-radius: 2px;
  background: rgba(8, 10, 14, 0.88);
  color: #e8c970;
  cursor: pointer;
  font-size: clamp(0.95rem, 55%, 1.35rem);
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.interactive .filled:hover .clear,
.interactive .selected .clear {
  opacity: 1;
  pointer-events: auto;
}
</style>
