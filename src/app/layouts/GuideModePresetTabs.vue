<template>
  <div :class="$style.modeFilters">
    <UiPresetTabs
      v-model="specMode"
      :tabs="specTabs"
      aria-label="Пробуждение или наследие"
    />
    <div :class="$style.presets">
      <UiPresetTabs
        v-model="guidePreset"
        :tabs="guidePresets"
        aria-label="Пресет гайда"
      >
        <template #tab="{ tab }">
          {{ tab.label }}
          <span
            v-if="presetFill[tab.id as keyof PresetFillMap]"
            :class="$style.presetDot"
            title="Есть данные"
            aria-label="Есть данные"
          />
        </template>
      </UiPresetTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CRYSTAL_PRESETS,
  emptyPresetFill,
  useGuidePreset,
  useGuideSpecMode,
  type GuideSpecMode,
  type PresetFillMap,
} from '@/shared/lib'
import UiPresetTabs from '@/shared/ui/UiPresetTabs.vue'

withDefaults(
  defineProps<{
    presetFill?: PresetFillMap
  }>(),
  {
    presetFill: () => emptyPresetFill(),
  },
)

const specMode = useGuideSpecMode()
const guidePreset = useGuidePreset()
const guidePresets = CRYSTAL_PRESETS

const specTabs: ReadonlyArray<{ id: GuideSpecMode; label: string }> = [
  { id: 'awakening', label: 'Пробуждение' },
  { id: 'succession', label: 'Наследие' },
]
</script>

<style module>
/* Outer plate — same gold rim as HomeClassFilters; tabs stay UiPresetTabs. */
.modeFilters {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem 1.1rem;
  width: 100%;
  min-width: 0;
  padding: 0.7rem 1.1rem;
  border: 0;
  border-radius: 1.25rem;
  background: color-mix(in srgb, #050505 72%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: none;
}

.modeFilters::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(196, 148, 88, 0.78) 0%,
    rgba(160, 118, 68, 0.55) 28%,
    rgba(130, 96, 52, 0.48) 62%,
    rgba(110, 80, 44, 0.5) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.modeFilters > :global(*) {
  position: relative;
  z-index: 1;
}

.presets {
  margin-left: auto;
}

.presetDot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--color-gold);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-gold) 55%, transparent);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .modeFilters {
    border-radius: 1.15rem;
    padding: 0.6rem 0.85rem;
  }
}
</style>
