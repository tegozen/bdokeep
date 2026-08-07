<template>
  <div :class="$style.modeFilters">
    <UiPresetTabs
      v-model="specMode"
      :tabs="specTabs"
      aria-label="Пробуждение или наследие"
    />
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
.modeFilters {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.85rem;
  height: 100%;
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
