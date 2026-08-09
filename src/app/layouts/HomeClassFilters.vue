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
      size="md"
      label-placement="start"
      label="Скрыть пустые"
      :class="$style.switch"
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
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem 1.75rem;
  width: 100%;
  min-width: 0;
  min-height: 4.25rem;
  padding: 0.95rem 1.5rem;
  border: 0;
  border-radius: 1.35rem;
  background: color-mix(in srgb, #050505 72%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: none;
}

/* Gradient rim: bright copper top-left → dark bottom-right. */
.root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(196, 148, 88, 0.72) 0%,
    rgba(140, 100, 55, 0.42) 18%,
    rgba(70, 50, 30, 0.28) 42%,
    rgba(30, 22, 14, 0.35) 68%,
    rgba(18, 14, 10, 0.55) 100%
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

.chips,
.switch {
  position: relative;
  z-index: 1;
}

.chips {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.chip {
  box-sizing: border-box;
  flex-shrink: 0;
  height: 2.6rem;
  min-width: 4.5rem;
  border: 1px solid rgba(120, 100, 75, 0.28);
  border-radius: 999px;
  background: rgba(10, 9, 8, 0.55);
  color: #c9b59a;
  cursor: pointer;
  font: inherit;
  font-size: 0.98rem;
  line-height: 1;
  padding: 0 1.45rem;
  white-space: nowrap;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease;
}

.chip:hover {
  border-color: rgba(180, 140, 85, 0.45);
  color: #e2d0b0;
}

.chipOn {
  border-color: rgba(196, 150, 88, 0.7);
  background:
    radial-gradient(ellipse 90% 120% at 50% 0%, rgba(180, 130, 70, 0.45), transparent 70%),
    linear-gradient(180deg, #2a2216 0%, #16120c 100%);
  color: #f0dfc0;
  box-shadow:
    0 0 12px rgba(180, 130, 70, 0.22),
    inset 0 1px 0 rgba(230, 190, 120, 0.22);
}

.chipOn:hover {
  color: #fff0d2;
  border-color: rgba(210, 165, 95, 0.8);
}

.switch {
  flex-shrink: 0;
  color: #c9b59a;
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .root {
    min-height: 0;
    border-radius: 1.15rem;
    padding: 0.8rem 1.05rem;
    gap: 0.6rem 1.15rem;
  }

  .chip {
    height: 2.35rem;
    min-width: 0;
    font-size: 0.9rem;
    padding: 0 1.15rem;
  }
}
</style>
