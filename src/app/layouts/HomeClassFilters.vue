<template>
  <div :class="$style.root">
    <div
      :class="$style.chips"
      role="group"
      aria-label="Фильтр по тиру"
    >
      <button
        v-for="opt in tierOptions"
        :key="String(opt.min)"
        type="button"
        :class="[$style.chip, tierMin === opt.min && $style.chipOn]"
        :aria-pressed="tierMin === opt.min"
        @click="tierMin = opt.min"
      >
        {{ opt.label }}
      </button>
    </div>
    <UiSwitch
      v-model="hideEmpty"
      size="sm"
      label-placement="start"
      label="Скрыть пустые"
    />
  </div>
</template>

<script setup lang="ts">
import { useHomeClassFilters } from '@/shared/lib'
import UiSwitch from '@/shared/ui/UiSwitch.vue'

const { tierMin, hideEmpty, tierOptions } = useHomeClassFilters()
</script>

<style module>
.root {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.45rem 0.85rem;
  min-width: 0;
}

.chips {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0.3rem;
}

.chip {
  box-sizing: border-box;
  flex-shrink: 0;
  height: 2rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-gold-soft);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  line-height: 1;
  padding: 0 0.65rem;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .root {
    flex-wrap: wrap;
  }

  .chips {
    flex-wrap: wrap;
  }
}

.chip:hover {
  border-color: var(--color-border-strong);
  color: var(--color-gold);
}

.chipOn {
  background: var(--color-gold-dim);
  border-color: var(--color-border-strong);
  color: var(--color-gold);
}
</style>
