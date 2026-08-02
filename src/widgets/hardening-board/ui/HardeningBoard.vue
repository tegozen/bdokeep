<template>
  <div :class="[$style.wrap, interactive && $style.interactive, listOnly && $style.listOnly]">
    <div
      v-if="!listOnly"
      :class="$style.slots"
      role="list"
      aria-label="Активные камни закалки"
    >
      <button
        v-for="slot in slots"
        :key="slot.id"
        type="button"
        role="listitem"
        :class="[
          $style.slot,
          selectedId === slot.id && $style.selected,
          filled[slot.id] && $style.filled,
        ]"
        :disabled="!interactive"
        :title="filled[slot.id]?.name_ru || slot.label"
        :aria-label="filled[slot.id]?.name_ru || slot.label"
        @click="onSelect(slot.id)"
      >
        <img
          v-if="filled[slot.id]?.icon_url"
          :src="filled[slot.id]!.icon_url!"
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

    <div :class="[$style.effects, listOnly && $style.effectsGrow]">
      <p :class="$style.effectsTitle">Эффекты оружия</p>
      <ul v-if="effectRows.length" :class="$style.effectsList">
        <li v-for="row in effectRows" :key="row.id" :class="$style.effectItem">
          <img
            v-if="row.icon_url"
            :src="row.icon_url"
            alt=""
            :class="$style.effectIcon"
            loading="lazy"
          >
          <span>{{ effectLabel(row.name_ru) }}</span>
        </li>
      </ul>
      <p v-else :class="$style.effectsEmpty">Пока пусто</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HARDENING_SLOTS } from '@/shared/lib/hardeningSlots'

export type HardeningFill = {
  id: string
  name_ru: string
  icon_url: string | null
}

const props = withDefaults(
  defineProps<{
    filled?: Record<string, HardeningFill | null | undefined>
    selectedId?: string | null
    interactive?: boolean
    /** Draft/preview: only the effects list, no slot row / fixed height. */
    listOnly?: boolean
  }>(),
  {
    filled: () => ({}),
    selectedId: null,
    interactive: false,
    listOnly: false,
  },
)

const emit = defineEmits<{
  select: [id: string]
  clear: [id: string]
}>()

const slots = HARDENING_SLOTS

const effectRows = computed(() => {
  const rows: HardeningFill[] = []
  for (const slot of slots) {
    const item = props.filled[slot.id]
    if (item) rows.push(item)
  }
  return rows
})

/** Strip catalog prefix «Камень закалки – …» for the effects list. */
function effectLabel(name: string): string {
  return name.replace(/^Камень закалки\s*[–—\-]\s*/i, '').trim() || name
}

function onSelect(id: string) {
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
  display: grid;
  gap: 0.85rem;
  width: max-content;
  max-width: 100%;
}

.interactive .slot {
  cursor: pointer;
}

.slots {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
}

.slot {
  position: relative;
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border: 1px solid var(--color-border);
  background: #0a0a0a;
  padding: 0;
  color: var(--color-muted);
}

.selected {
  border-color: var(--color-gold);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 55%, transparent);
}

.filled {
  border-color: color-mix(in srgb, var(--color-border-strong) 70%, var(--color-gold));
}

.icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.plus {
  font-size: 1.15rem;
  line-height: 1;
  color: var(--color-muted);
}

.clear {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-elevated);
  color: var(--color-muted);
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
}

.clear:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.listOnly {
  width: 100%;
}

.effects {
  display: flex;
  flex-direction: column;
  min-height: 11rem;
  max-height: 11rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-panel) 88%, #000);
  padding: 0.7rem 0.85rem;
  overflow: hidden;
}

.effectsGrow {
  min-height: 0;
  max-height: none;
  overflow: visible;
}

.effectsGrow .effectsList {
  overflow: visible;
}

.effectsTitle {
  margin: 0 0 0.45rem;
  flex-shrink: 0;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.effectsList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
  min-height: 0;
  overflow: auto;
}

.effectItem {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  line-height: 1.3;
  color: var(--color-ink);
}

.effectIcon {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.effectsEmpty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}
</style>
