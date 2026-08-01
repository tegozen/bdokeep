<template>
  <div :class="$style.modeFilters">
    <div
      :class="$style.modeTabs"
      role="tablist"
      aria-label="Пробуждение или наследие"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="specMode === 'awakening'"
        :class="[$style.modeTab, specMode === 'awakening' && $style.modeTabOn]"
        @click="specMode = 'awakening'"
      >
        Пробуждение
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="specMode === 'succession'"
        :class="[$style.modeTab, specMode === 'succession' && $style.modeTabOn]"
        @click="specMode = 'succession'"
      >
        Наследие
      </button>
    </div>
    <div
      :class="$style.modeTabs"
      role="tablist"
      aria-label="Пресет гайда"
    >
      <button
        v-for="p in guidePresets"
        :key="p.id"
        type="button"
        role="tab"
        :aria-selected="guidePreset === p.id"
        :class="[$style.modeTab, guidePreset === p.id && $style.modeTabOn]"
        @click="guidePreset = p.id"
      >
        {{ p.label }}
        <span
          v-if="presetFill[p.id]"
          :class="$style.presetDot"
          title="Есть данные"
          aria-label="Есть данные"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CRYSTAL_PRESETS,
  useGuidePreset,
  useGuideSpecMode,
  type PresetFillMap,
} from '@/shared/lib'

withDefaults(
  defineProps<{
    presetFill?: PresetFillMap
  }>(),
  {
    presetFill: () => ({ t1: false, t2: false, besp: false, sub: false }),
  },
)

const specMode = useGuideSpecMode()
const guidePreset = useGuidePreset()
const guidePresets = CRYSTAL_PRESETS
</script>

<style module>
.modeFilters {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.85rem;
  height: 100%;
}

.modeTabs {
  display: inline-flex;
  align-items: stretch;
  height: 100%;
  min-height: 2rem;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, #000 35%, transparent);
  padding: 2px;
}

.modeTab {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1;
  padding: 0 0.75rem;
}

.modeTab:hover {
  color: var(--color-gold-soft);
}

.modeTabOn {
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.presetDot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--color-gold);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-gold) 55%, transparent);
  flex-shrink: 0;
}
</style>
