<template>
  <div :class="$style.root">
    <UiPresetTabs
      v-model="status"
      :tabs="statusTabs"
      aria-label="Статус заявок"
    />
    <button
      v-if="classFilter"
      type="button"
      :class="[$style.chip, $style.chipOn]"
      @click="clearClassFilter"
    >
      Класс: {{ classFilter }} ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAdminProposalFilters } from '@/shared/lib'
import UiPresetTabs from '@/shared/ui/UiPresetTabs.vue'

const { status, classFilter, clearClassFilter, statusTabs } = useAdminProposalFilters()
</script>

<style module>
/* Same gold-rim plate as HomeClassFilters — dissolves into header shell on mobile. */
.root {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  width: 100%;
  min-width: 0;
  padding: 0.7rem 1.1rem;
  border: 0;
  border-radius: 1.25rem;
  background: color-mix(in srgb, #050505 72%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: none;
}

.root::before {
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

.root > :global(*) {
  position: relative;
  z-index: 1;
}

.chip {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.75rem;
}

.chipOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

@media (max-width: 640px) {
  .root {
    flex-direction: column;
    align-items: stretch;
    border-radius: 1rem;
    padding: 0.7rem 0.8rem;
    gap: 0.7rem;
  }

  .root > :global([role='tablist']) {
    display: flex;
    width: 100%;
  }

  .root > :global([role='tablist'] > *) {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: 0.35rem;
    font-size: 0.78rem;
  }
}
</style>
