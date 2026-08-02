<template>
  <div :class="[$style.board, interactive && $style.interactive]">
    <div
      v-for="level in levels"
      :key="level"
      :class="[$style.row, isPanelActive(level) && $style.rowOn]"
    >
      <button
        type="button"
        :class="[
          $style.skillSlot,
          selectedId === skillSlotId(level) && $style.selected,
          filled[level]?.skill && $style.filled,
        ]"
        :disabled="!interactive"
        :title="filled[level]?.skill?.name_ru || `Ур. ${level}`"
        :aria-label="filled[level]?.skill?.name_ru || `Ур. ${level}`"
        @click="onSelect(skillSlotId(level))"
      >
        <img
          v-if="filled[level]?.skill?.icon_url"
          :src="filled[level]!.skill!.icon_url!"
          alt=""
          :class="$style.icon"
          draggable="false"
          loading="lazy"
        >
        <span
          v-if="interactive && filled[level]?.skill"
          :class="$style.clear"
          role="presentation"
          aria-hidden="true"
          title="Очистить"
          @click.stop="onClear(skillSlotId(level))"
        >×</span>
        <span v-else-if="interactive" :class="$style.plus">+</span>
      </button>

      <div :class="$style.body">
        <strong :class="filled[level]?.skill ? $style.skillName : $style.levelLabel">
          {{ filled[level]?.skill?.name_ru || `Ур. ${level}` }}
        </strong>

        <div :class="$style.effects">
          <button
            v-for="fx in effectSlots(level)"
            :key="fx.id"
            type="button"
            :class="[
              $style.effectLine,
              selectedId === fx.id && $style.effectOn,
              !fx.label && $style.effectEmpty,
            ]"
            :disabled="!interactive"
            :title="fx.label || undefined"
            @click="onSelect(fx.id)"
          >
            <span :class="$style.effectText">
              {{
                fx.label
                  || (interactive && filled[level]?.skill
                    ? 'Выберите эффект'
                    : interactive
                      ? 'Сначала скилл'
                      : '\u00a0')
              }}
            </span>
            <span
              v-if="interactive && fx.label"
              :class="$style.effectClear"
              role="presentation"
              aria-hidden="true"
              title="Очистить"
              @click.stop="onClear(fx.id)"
            >×</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  MORPH_SLOT_LEVELS,
  morphEffectSlotId,
  morphSkillSlotId,
  parseMorphBoardSlot,
  type MorphSlotLevel,
} from '@/shared/lib'

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
    selectedId?: string | null
    /** @deprecated use selectedId */
    selectedLevel?: MorphSlotLevel | null
    interactive?: boolean
  }>(),
  {
    filled: () => ({}),
    selectedId: null,
    selectedLevel: null,
    interactive: false,
  },
)

const emit = defineEmits<{
  select: [id: string]
  clear: [id: string]
}>()

const levels = MORPH_SLOT_LEVELS

function skillSlotId(level: MorphSlotLevel) {
  return morphSkillSlotId(level)
}

function effectSlots(level: MorphSlotLevel) {
  const fill = props.filled[level]
  return [
    { id: morphEffectSlotId(level, 'a'), label: fill?.effect1Label || null },
    { id: morphEffectSlotId(level, 'b'), label: fill?.effect2Label || null },
  ]
}

function isPanelActive(level: MorphSlotLevel): boolean {
  const sel = props.selectedId ?? (props.selectedLevel != null ? String(props.selectedLevel) : null)
  if (!sel) return false
  const parsed = parseMorphBoardSlot(sel)
  return parsed?.level === level
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
.board {
  display: grid;
  gap: 0;
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
}

.row {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr);
  gap: 0.65rem;
  align-items: center;
  /* Fixed row height — long effect labels ellipsis instead of growing the row */
  height: 4.5rem;
  box-sizing: border-box;
  border-bottom: 1px solid var(--color-border);
  padding: 0.45rem 0.65rem;
}

.row:last-child {
  border-bottom: none;
}

.rowOn {
  background: color-mix(in srgb, var(--color-gold) 8%, transparent);
}

.interactive .skillSlot,
.interactive .effectLine {
  cursor: pointer;
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

.selected,
.effectOn {
  border-color: var(--color-gold);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 45%, transparent);
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
}

.clear {
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-elevated);
  color: var(--color-muted);
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
}

.clear:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.body {
  min-width: 0;
  display: grid;
  gap: 0.15rem;
}

.skillName,
.levelLabel {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  line-height: 1.2;
  color: var(--color-ink);
}

.levelLabel {
  color: var(--color-gold);
  font-weight: 600;
}

.effects {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}

.effectLine {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  height: 1.15rem;
  margin: 0;
  border: 1px solid transparent;
  background: transparent;
  padding: 0 0.15rem;
  text-align: left;
  color: var(--color-gold);
  font: inherit;
}

.effectEmpty {
  color: var(--color-muted);
}

.effectText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  line-height: 1.15rem;
}

.effectClear {
  flex-shrink: 0;
  color: var(--color-muted);
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
}

.effectClear:hover {
  color: var(--color-danger);
}
</style>
