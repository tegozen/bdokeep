<template>
  <div :class="$style.root">
    <UiPresetTabs
      v-model="tierMin"
      :tabs="tierTabs"
      aria-label="Фильтр по тиру"
    />
    <div :class="$style.switches">
      <UiSwitch
        v-model="hideEmpty"
        size="md"
        label-placement="start"
        label="Скрыть пустые"
      />
      <UiSwitch
        v-if="isStaff"
        v-model="showProposals"
        size="md"
        label-placement="start"
        label="Показать предложения"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSuperadmin } from '@/features/superadmin-auth'
import {
  useHomeClassFilters,
  type HomeTierMin,
} from '@/pages/home'
import UiPresetTabs from '@/shared/ui/UiPresetTabs.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'

const { isStaff } = useSuperadmin()
const { tierMin, hideEmpty, showProposals, tierOptions } = useHomeClassFilters()

const tierTabs = computed(() =>
  tierOptions.map((opt) => ({
    id: opt.min as HomeTierMin,
    label: opt.label,
  })),
)
</script>

<style module>
.root {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.75rem;
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

.switches {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem 1.35rem;
  margin-left: auto;
  color: #c9b59a;
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .root {
    flex-direction: column;
    align-items: stretch;
    border-radius: 1rem;
    padding: 0.7rem 0.8rem;
    gap: 0.7rem;
  }

  /* Tier tabs stretch full width. */
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

  .switches {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;
    width: 100%;
    margin-left: 0;
    font-size: 0.88rem;
  }

  .switches > :global(*) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
