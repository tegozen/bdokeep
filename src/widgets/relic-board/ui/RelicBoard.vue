<template>
  <div :class="[$style.wrap, interactive && $style.interactive]">
    <div :class="$style.relics" role="list" aria-label="Реликвии">
      <button
        v-for="panel in panels"
        :key="panel.relic"
        type="button"
        role="listitem"
        :class="[
          $style.relicSlot,
          selectedId === panel.relic && $style.selected,
          filled[panel.relic] && $style.filled,
        ]"
        :disabled="!interactive"
        :title="filled[panel.relic]?.name_ru || panel.label"
        :aria-label="filled[panel.relic]?.name_ru || panel.label"
        @click="onSelect(panel.relic)"
      >
        <img
          v-if="filled[panel.relic]?.icon_url"
          :src="codexIconSrc(filled[panel.relic]!.icon_url) || undefined"
          alt=""
          :class="$style.relicIcon"
          draggable="false"
          loading="lazy"
        >
        <span v-else-if="interactive" :class="$style.plus">+</span>
      </button>
    </div>

    <!-- Propose: whole set is one control -->
    <button
      v-if="lightstonesAsSet"
      type="button"
      :class="[
        $style.setBtn,
        lightsSelected && $style.selected,
        anyLightFilled && $style.filled,
      ]"
      :disabled="!interactive"
      :title="setTitle"
      :aria-label="setTitle"
      @click="onSelectSet"
    >
      <ul :class="$style.lights" aria-hidden="true">
        <li
          v-for="lightId in lightIds"
          :key="lightId"
          :class="$style.lightRow"
        >
          <span :class="[$style.lightSlot, filled[lightId] && $style.lightFilled]">
            <img
              v-if="filled[lightId]?.icon_url"
              :src="codexIconSrc(filled[lightId]!.icon_url) || undefined"
              alt=""
              :class="$style.lightIcon"
              draggable="false"
              loading="lazy"
            >
          </span>
          <span :class="[$style.lightName, !filled[lightId] && $style.lightEmpty]">
            {{ filled[lightId]?.name_ru || 'Пусто' }}
          </span>
        </li>
      </ul>
      <span v-if="interactive && !anyLightFilled" :class="$style.setPlus">+</span>
    </button>

    <!-- Read-only / per-stone: plain list -->
    <ul
      v-else
      :class="$style.lights"
      aria-label="Светящиеся камни"
    >
      <li
        v-for="lightId in lightIds"
        :key="lightId"
        :class="$style.lightRow"
      >
        <button
          type="button"
          :class="[
            $style.lightSlot,
            selectedId === lightId && $style.selected,
            filled[lightId] && $style.filled,
          ]"
          :disabled="!interactive"
          :title="filled[lightId]?.name_ru || 'Светящийся камень'"
          :aria-label="filled[lightId]?.name_ru || 'Светящийся камень'"
          @click="onSelectLight(lightId)"
        >
          <img
            v-if="filled[lightId]?.icon_url"
            :src="codexIconSrc(filled[lightId]!.icon_url) || undefined"
            alt=""
            :class="$style.lightIcon"
            draggable="false"
            loading="lazy"
          >
          <span v-else-if="interactive" :class="$style.plus">+</span>
        </button>
        <p :class="[$style.lightName, !filled[lightId] && $style.lightEmpty]">
          {{ filled[lightId]?.name_ru || 'Пусто' }}
        </p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { codexIconSrc } from '@/shared/lib/codexIcon'
import {
  isLightstoneSlotId,
  LIGHTSTONE_SLOT_IDS,
  RELIC_BOARD_PANELS,
} from '@/shared/lib/relicSlots'

export type RelicFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

const props = withDefaults(
  defineProps<{
    filled?: Record<string, RelicFill | null | undefined>
    selectedId?: string | null
    interactive?: boolean
    /** Propose UI: stones are a set — one control for the whole set. */
    lightstonesAsSet?: boolean
  }>(),
  {
    filled: () => ({}),
    selectedId: null,
    interactive: false,
    lightstonesAsSet: false,
  },
)

const emit = defineEmits<{
  select: [id: string]
}>()

const panels = RELIC_BOARD_PANELS
const lightIds = LIGHTSTONE_SLOT_IDS

const lightsSelected = computed(() => {
  const sel = props.selectedId
  return Boolean(sel && isLightstoneSlotId(sel))
})

const anyLightFilled = computed(() =>
  LIGHTSTONE_SLOT_IDS.some((id) => Boolean(props.filled[id])),
)

const setTitle = computed(() => {
  if (!anyLightFilled.value) return 'Выбрать набор камней'
  const names = LIGHTSTONE_SLOT_IDS.map((id) => props.filled[id]?.name_ru).filter(Boolean)
  return names.length ? names.join(', ') : 'Набор камней'
})

function onSelect(id: string) {
  if (!props.interactive) return
  emit('select', id)
}

function onSelectSet() {
  if (!props.interactive) return
  const first = LIGHTSTONE_SLOT_IDS[0]
  if (first) emit('select', first)
}

function onSelectLight(id: string) {
  if (!props.interactive) return
  emit('select', id)
}
</script>

<style module>
.wrap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.interactive .relicSlot,
.interactive .lightSlot,
.interactive .setBtn {
  cursor: pointer;
}

.relics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.relicSlot,
.lightSlot {
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  background: #0a0a0a;
  padding: 0;
  color: var(--color-muted);
}

.relicSlot {
  /* 2.75rem × 1.7 */
  width: 4.675rem;
  height: 4.675rem;
  flex-shrink: 0;
}

.lightSlot {
  width: 2.1rem;
  height: 2.1rem;
  flex-shrink: 0;
}

.setBtn {
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0.5rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-panel) 88%, #000);
  color: inherit;
  font: inherit;
  text-align: left;
}

.setBtn:disabled {
  cursor: default;
}

.selected {
  border-color: var(--color-gold);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 55%, transparent);
}

.filled {
  border-color: color-mix(in srgb, var(--color-border-strong) 70%, var(--color-gold));
}

.lightFilled {
  border-color: color-mix(in srgb, var(--color-border-strong) 70%, var(--color-gold));
}

.relicIcon,
.lightIcon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.plus,
.setPlus {
  font-size: 1.15rem;
  line-height: 1;
  color: var(--color-muted);
}

.setPlus {
  position: absolute;
  top: 0.35rem;
  right: 0.45rem;
}

.lights {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}

.lightRow {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  min-width: 0;
}

.lightName {
  margin: 0;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.lightEmpty {
  color: var(--color-muted);
}
</style>
