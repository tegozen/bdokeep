<template>
  <div :class="[$style.wrap, interactive && $style.interactive]">
    <div
      v-for="panel in panels"
      :key="panel.relic"
      :class="[$style.panel, isPanelActive(panel.relic) && $style.panelOn]"
    >
      <button
        type="button"
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
        <span
          v-if="interactive && filled[panel.relic]"
          :class="$style.clear"
          role="presentation"
          aria-hidden="true"
          title="Очистить"
          @click.stop="onClear(panel.relic)"
        >×</span>
        <span v-else-if="interactive" :class="$style.plus">+</span>
      </button>

      <div :class="$style.branch" aria-hidden="true">
        <span :class="$style.branchStem" />
        <span :class="$style.branchFork" />
      </div>

      <div :class="$style.lights">
        <div
          v-for="lightId in panel.lights"
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
            @click="onSelect(lightId)"
          >
            <img
              v-if="filled[lightId]?.icon_url"
              :src="codexIconSrc(filled[lightId]!.icon_url) || undefined"
              alt=""
              :class="$style.lightIcon"
              draggable="false"
              loading="lazy"
            >
            <span
              v-if="interactive && filled[lightId]"
              :class="$style.clear"
              role="presentation"
              aria-hidden="true"
              title="Очистить"
              @click.stop="onClear(lightId)"
            >×</span>
            <span v-else-if="interactive" :class="$style.plus">+</span>
          </button>
          <p :class="[$style.lightName, !filled[lightId] && $style.lightEmpty]">
            {{
              filled[lightId]?.name_ru || 'Нет используемых светящихся камней.'
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { codexIconSrc } from '@/shared/lib/codexIcon'
import { RELIC_BOARD_PANELS, type RelicSlotId } from '@/shared/lib/relicSlots'

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
  }>(),
  {
    filled: () => ({}),
    selectedId: null,
    interactive: false,
  },
)

const emit = defineEmits<{
  select: [id: string]
  clear: [id: string]
}>()

const panels = RELIC_BOARD_PANELS

function isPanelActive(relic: RelicSlotId): boolean {
  const sel = props.selectedId
  if (!sel) return false
  if (sel === relic) return true
  return sel.startsWith(`${relic}_`)
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
  width: min(100%, 28rem);
}

.interactive .relicSlot,
.interactive .lightSlot {
  cursor: pointer;
}

.panel {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.35rem 0.55rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-panel) 88%, #000);
  padding: 0.85rem 0.9rem;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.panelOn {
  border-color: var(--color-gold);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-gold) 45%, transparent);
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
  width: 4.25rem;
  height: 4.25rem;
}

.lightSlot {
  width: 2.35rem;
  height: 2.35rem;
  flex-shrink: 0;
}

.selected {
  border-color: var(--color-gold);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 55%, transparent);
}

.filled {
  border-color: color-mix(in srgb, var(--color-border-strong) 70%, var(--color-gold));
}

.relicIcon,
.lightIcon {
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

.branch {
  position: relative;
  width: 1.1rem;
  height: 3.6rem;
  align-self: center;
}

.branchStem {
  position: absolute;
  top: 50%;
  left: 0;
  width: 0.55rem;
  height: 1px;
  background: color-mix(in srgb, var(--color-gold) 55%, var(--color-border));
  transform: translateY(-50%);
}

.branchFork {
  position: absolute;
  top: 0.55rem;
  bottom: 0.55rem;
  left: 0.55rem;
  width: 1px;
  background: color-mix(in srgb, var(--color-gold) 55%, var(--color-border));
}

.branchFork::before,
.branchFork::after {
  content: '';
  position: absolute;
  left: 0;
  width: 0.55rem;
  height: 1px;
  background: color-mix(in srgb, var(--color-gold) 55%, var(--color-border));
}

.branchFork::before {
  top: 0;
}

.branchFork::after {
  bottom: 0;
}

.lights {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}

.lightRow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.lightName {
  margin: 0;
  min-width: 0;
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--color-ink);
}

.lightEmpty {
  color: var(--color-muted);
}

@media (max-width: 520px) {
  .wrap {
    width: 100%;
  }

  .panel {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .branch {
    display: none;
  }

  .lights {
    grid-column: 1 / -1;
  }
}
</style>
