<template>
  <div :class="$style.root">
    <UiPresetTabs
      v-model="status"
      :tabs="statusTabs"
      aria-label="Статус заявок"
    />
    <div :class="$style.selects">
      <select
        v-model="classFilter"
        :class="[$style.select, classFilter ? $style.selectOn : null]"
        aria-label="Фильтр по классу"
      >
        <option value="">Все классы</option>
        <option
          v-for="c in classes"
          :key="c.slug"
          :value="c.slug"
        >
          {{ c.name_ru }}
        </option>
      </select>
      <select
        v-model="sectionFilter"
        :class="[$style.select, sectionFilter ? $style.selectOn : null]"
        aria-label="Фильтр по разделу"
      >
        <option value="">Все разделы</option>
        <option
          v-for="s in sectionOptions"
          :key="s.id"
          :value="s.id"
        >
          {{ s.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchPublishedClasses, type BdoClass } from '@/entities/class'
import { useAdminProposalFilters } from '@/features/superadmin-auth'
import UiPresetTabs from '@/shared/ui/UiPresetTabs.vue'

const { status, classFilter, sectionFilter, statusTabs, sectionOptions } =
  useAdminProposalFilters()

const { data: classes } = await useAsyncData(
  'admin-proposal-filter-classes',
  () => fetchPublishedClasses(),
  { default: () => [] as BdoClass[] },
)
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

.selects {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem 0.85rem;
  min-width: 0;
  margin-left: auto;
}

.select {
  box-sizing: border-box;
  min-width: 10.5rem;
  max-width: min(16rem, 100%);
  min-height: 2.1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.55rem;
  background: color-mix(in srgb, #050505 55%, transparent);
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.3rem 1.75rem 0.3rem 0.65rem;
}

.select:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
  outline-offset: 1px;
}

.selectOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.select option {
  background: #121212;
  color: var(--color-ink);
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

  .selects {
    width: 100%;
    margin-left: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
  }

  .select {
    width: 100%;
    max-width: none;
    min-width: 0;
  }
}
</style>
