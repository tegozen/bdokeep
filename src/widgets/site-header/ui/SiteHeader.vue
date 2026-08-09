<template>
  <header :class="[$style.header, stableHeight && $style.headerStable]">
    <div :class="$style.headerInner">
      <NuxtLink to="/" :class="$style.brand">
        <span :class="$style.brandMark">BDO</span>
        <span :class="$style.brandName">Keep</span>
      </NuxtLink>

      <div v-if="$slots.class" :class="$style.classBlock">
        <slot name="class" />
      </div>

      <div v-if="$slots.modes" :class="$style.guideModes">
        <slot name="modes" />
      </div>

      <div v-if="$slots.filters" :class="$style.homeFilters">
        <slot name="filters" />
      </div>

      <div :class="$style.actions">
        <slot
          name="actions"
          :action-class="$style.action"
          :badge-class="$style.actionBadge"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Keep sticky row height stable (class guide pages with tabs). */
    stableHeight?: boolean
  }>(),
  {
    stableHeight: false,
  },
)
</script>

<style module>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  background: linear-gradient(180deg, rgba(10, 11, 16, 0.95), rgba(10, 11, 16, 0.7));
}

/* Stable sticky row height on class pages (tabs + actions). */
.headerStable .headerInner {
  min-height: 2.75rem;
}

.headerInner {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  width: min(calc(100% - 2rem), 1920px);
  margin-inline: auto;
  padding-block: 0.85rem;
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: baseline;
  gap: 0.375rem;
  color: var(--color-ink);
  text-decoration: none;
}

.brand:hover {
  color: var(--color-ink);
}

.brandMark {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  color: var(--color-gold);
}

.brandName {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.05em;
}

.classBlock {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  min-width: 0;
}

.homeFilters {
  display: flex;
  min-width: 0;
  align-items: center;
}

.guideModes {
  display: flex;
  min-width: 0;
  align-items: center;
}

.guideModes :global([class*='modeFilters']) {
  height: auto;
}

.actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-left: auto;
  min-width: 0;
  min-height: 2rem;
}

.action {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
  box-sizing: border-box;
  height: 2rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-gold-soft);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1;
  padding: 0 0.65rem;
  text-decoration: none;
  white-space: nowrap;
}

.action:hover {
  border-color: var(--color-border-strong);
  color: var(--color-gold);
}

.actionBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
  border-radius: 999px;
  background: var(--color-gold-dim);
  color: var(--color-gold);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.15rem 0.35rem;
  text-align: center;
  pointer-events: none;
}

/*
  Phone / tablet: brand + actions on top, class + mode/preset tabs below.
  Home filters stay on the brand/actions row when they fit; wrap only via flex-wrap.
*/
@media (max-width: 1099px) {
  .headerInner {
    align-items: flex-start;
  }

  .brand {
    order: 1;
    min-height: 2rem;
    align-items: center;
  }

  .homeFilters {
    order: 2;
    flex: 0 0 auto;
  }

  .actions {
    order: 3;
    max-width: calc(100% - 7.5rem);
  }

  .classBlock {
    order: 4;
    flex: 1 1 100%;
  }

  .guideModes {
    order: 5;
    flex: 1 1 100%;
  }

  .action {
    font-size: 0.78rem;
    padding: 0 0.5rem;
  }
}

/* Narrow phones: actions on their own row under the brand; filters follow. */
@media (max-width: 640px) {
  .brandMark,
  .brandName {
    font-size: 1.25rem;
  }

  .actions {
    order: 2;
    flex: 1 1 100%;
    max-width: none;
    margin-left: 0;
    justify-content: flex-start;
  }

  .homeFilters {
    order: 3;
    flex: 1 1 100%;
  }

  .classBlock {
    order: 4;
  }

  .guideModes {
    order: 5;
  }
}

@media (min-width: 1100px) {
  .headerInner {
    align-items: center;
    padding-block: 1rem;
    gap: 0.75rem 1.25rem;
  }

  .brand {
    order: 1;
  }

  .classBlock {
    order: 2;
    flex: 1 1 auto;
  }

  .homeFilters {
    order: 3;
    flex: 0 0 auto;
  }

  .guideModes {
    order: 3;
    flex: 0 1 auto;
  }

  .guideModes :global([class*='modeFilters']) {
    height: 2rem;
  }

  .actions {
    order: 4;
    flex-wrap: nowrap;
    flex-shrink: 0;
    align-items: stretch;
    gap: 0.85rem;
    height: 2rem;
    max-width: none;
  }
}
</style>
