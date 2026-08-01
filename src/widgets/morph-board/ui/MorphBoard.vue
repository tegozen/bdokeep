<template>
  <div :class="[$style.board, interactive && $style.interactive]">
    <div
      v-for="level in levels"
      :key="level"
      :class="[$style.row, selectedLevel === level && $style.rowOn]"
    >
      <button
        type="button"
        :class="[$style.skillSlot, filled[level]?.skill && $style.filled]"
        :disabled="!interactive"
        :aria-label="filled[level]?.skill?.name_ru || `Ур. ${level}`"
        @click="onSelect(level)"
      >
        <img
          v-if="filled[level]?.skill?.icon_url"
          :src="filled[level]!.skill!.icon_url!"
          alt=""
          :class="$style.icon"
          loading="lazy"
        >
        <span v-else-if="interactive" :class="$style.plus">+</span>
      </button>

      <div :class="$style.body">
        <strong :class="filled[level]?.skill ? $style.skillName : $style.level">
          {{ filled[level]?.skill?.name_ru || `Ур. ${level}` }}
        </strong>
        <div :class="$style.effects">
          <p
            :class="[
              $style.effectLine,
              !filled[level]?.effect1Label && $style.effectLineEmpty,
            ]"
          >
            {{
              filled[level]?.effect1Label
                || (interactive && filled[level]?.skill ? 'Выберите эффект' : '\u00a0')
            }}
          </p>
          <p
            :class="[
              $style.effectLine,
              !filled[level]?.effect2Label && $style.effectLineEmpty,
            ]"
          >
            {{
              filled[level]?.effect2Label
                || (interactive && filled[level]?.skill ? 'Выберите эффект' : '\u00a0')
            }}
          </p>
        </div>
      </div>

      <button
        v-if="interactive"
        type="button"
        :class="$style.action"
        :title="filled[level]?.skill ? 'Изменить' : 'Добавить'"
        :aria-label="filled[level]?.skill ? 'Изменить слот' : 'Добавить морф'"
        @click="onSelect(level)"
      >
        {{ filled[level]?.skill ? '⇄' : '+' }}
      </button>
      <button
        v-if="interactive && filled[level]?.skill"
        type="button"
        :class="$style.clearBtn"
        title="Очистить"
        aria-label="Очистить слот"
        @click.stop="onClear(level)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MORPH_SLOT_LEVELS, type MorphSlotLevel } from '@/shared/lib'

export type MorphSlotFill = {
  skill?: {
    id: string
    name_ru: string
    icon_url: string | null
    addon_tier?: number | null
  } | null
  effect1Label?: string | null
  effect2Label?: string | null
}

const props = withDefaults(
  defineProps<{
    filled?: Partial<Record<MorphSlotLevel, MorphSlotFill>>
    selectedLevel?: MorphSlotLevel | null
    interactive?: boolean
  }>(),
  {
    filled: () => ({}),
    selectedLevel: null,
    interactive: false,
  },
)

const emit = defineEmits<{
  select: [level: MorphSlotLevel]
  clear: [level: MorphSlotLevel]
}>()

const levels = MORPH_SLOT_LEVELS

function onSelect(level: MorphSlotLevel) {
  if (!props.interactive) return
  emit('select', level)
}

function onClear(level: MorphSlotLevel) {
  if (!props.interactive) return
  emit('clear', level)
}
</script>

<style module>
.board {
  display: grid;
  gap: 0;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
}

.row {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr) auto auto;
  gap: 0.65rem;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding: 0.55rem 0.65rem;
}

.row:last-child {
  border-bottom: none;
}

.rowOn {
  background: color-mix(in srgb, var(--color-gold) 8%, transparent);
}

.skillSlot {
  position: relative;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--color-border);
  background: #000;
  padding: 0;
  color: var(--color-muted);
}

.interactive .skillSlot {
  cursor: pointer;
}

.filled {
  border-color: var(--color-border-strong);
}

.icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.plus {
  font-size: 1.25rem;
  line-height: 1;
}

.body {
  min-width: 0;
  display: grid;
  gap: 0.2rem;
}

.skillName {
  display: block;
  font-size: 0.92rem;
  line-height: 1.25;
  color: var(--color-ink);
}

.level {
  display: block;
  font-size: 0.92rem;
  line-height: 1.25;
  color: var(--color-gold);
}

.effects {
  display: grid;
  gap: 0;
}

.effectLine {
  margin: 0;
  min-height: 1.15rem;
  font-size: 0.82rem;
  color: var(--color-gold);
  line-height: 1.15rem;
}

.effectLineEmpty {
  color: var(--color-muted);
}

.action,
.clearBtn {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-gold);
  cursor: pointer;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1;
  padding: 0.35rem 0.5rem;
}

.clearBtn {
  color: var(--color-muted);
}
</style>
