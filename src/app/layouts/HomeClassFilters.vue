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
  gap: 0.65rem 1.35rem;
  width: 100%;
  min-width: 0;
  padding: 0.7rem 1.35rem;
  border: 0;
  border-radius: 1.15rem;
  background:
    radial-gradient(ellipse 55% 140% at 8% 0%, rgba(140, 95, 45, 0.28), transparent 58%),
    radial-gradient(ellipse 40% 100% at 42% 110%, rgba(60, 40, 22, 0.22), transparent 55%),
    radial-gradient(ellipse 30% 80% at 90% 20%, rgba(80, 55, 30, 0.1), transparent 50%),
    linear-gradient(180deg, #12100d 0%, #090807 48%, #050403 100%);
  box-shadow:
    inset 0 1px 0 rgba(196, 150, 90, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45);
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
  gap: 0.55rem;
  min-width: 0;
}

.chip {
  box-sizing: border-box;
  flex-shrink: 0;
  height: 2.05rem;
  border: 1px solid rgba(120, 100, 75, 0.28);
  border-radius: 999px;
  background: rgba(10, 9, 8, 0.55);
  color: #c9b59a;
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  line-height: 1;
  padding: 0 1.1rem;
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
}

@media (max-width: 640px) {
  .root {
    border-radius: 1rem;
    padding: 0.7rem 0.95rem;
    gap: 0.55rem 1rem;
  }

  .chip {
    height: 1.9rem;
    font-size: 0.8rem;
    padding: 0 0.85rem;
  }
}
</style>
