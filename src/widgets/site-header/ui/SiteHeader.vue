<template>
  <header :class="[$style.header, stableHeight && $style.headerStable]">
    <div :class="$style.headerBar">
      <div :class="$style.headerInner">
        <NuxtLink to="/" :class="$style.brand" aria-label="BDO Keep — на главную">
          <img
            src="/brand/bdo-keep-logo.png"
            alt="BDO KEEP"
            width="282"
            height="92"
            :class="$style.brandLogo"
            decoding="async"
          >
        </NuxtLink>

        <div v-if="$slots.class" :class="$style.classBlock">
          <slot name="class" />
        </div>

        <div v-if="$slots.modes" :class="$style.guideModes">
          <slot name="modes" />
        </div>

        <div :class="$style.actions">
          <slot
            name="actions"
            :action-class="$style.action"
            :badge-class="$style.actionBadge"
          />
        </div>
      </div>
    </div>

    <div v-if="$slots.filters" :class="$style.filtersBar">
      <div :class="$style.filtersInner">
        <slot name="filters" />
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
  /* No gold radials — page bg (`/brand/page-bg.png`) stays visible. */
  background: color-mix(in srgb, #050505 55%, transparent);
  backdrop-filter: blur(12px);
}

.headerBar {
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
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
  gap: 0.65rem 1.25rem;
  width: var(--page-width);
  margin-inline: auto;
  padding-block: 1rem;
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  line-height: 0;
  text-decoration: none;
}

.brand:hover .brandLogo {
  filter:
    drop-shadow(0 0 10px rgba(212, 175, 98, 0.35))
    brightness(1.06);
}

.brandLogo {
  display: block;
  width: auto;
  height: 3.75rem;
  max-width: min(20rem, 70vw);
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(212, 175, 98, 0.22));
  transition: filter 140ms ease;
}

.classBlock {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  min-width: 0;
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
  gap: 0;
  margin-left: auto;
  min-width: 0;
  min-height: 2.25rem;
}

/* Equal breathing room on both sides of every divider. */
.actions > :global(*) {
  position: relative;
  box-sizing: border-box;
  margin: 0;
  padding: 0.35rem 1.35rem;
}

.actions > :global(*:first-child) {
  padding-left: 0;
}

.actions > :global(*:last-child) {
  padding-right: 0;
}

.actions > :global(* + *)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 1px;
  height: 1.15rem;
  background: color-mix(in srgb, var(--color-gold-soft) 35%, transparent);
  transform: translateY(-50%);
}

.action {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.55rem;
  box-sizing: border-box;
  min-height: 2.25rem;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--color-gold-soft) 88%, var(--color-muted));
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 400;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
}

.action :global(svg) {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
  opacity: 0.9;
}

.action:hover,
.action:focus-visible {
  color: var(--color-gold);
  outline: none;
}

.actionBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-gold) 18%, transparent);
  color: var(--color-gold);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.14rem 0.34rem;
  text-align: center;
  pointer-events: none;
}

.filtersBar {
  padding: 1rem var(--page-gutter) 1.15rem;
}

.filtersInner {
  width: var(--page-width);
  margin-inline: auto;
}

/*
  Phone / tablet: brand + actions on top, class + mode/preset tabs below.
*/
@media (max-width: 1099px) {
  .headerInner {
    align-items: flex-start;
    padding-block: 0.95rem;
  }

  .brand {
    order: 1;
    min-height: 2.25rem;
  }

  .actions {
    order: 2;
    max-width: calc(100% - 8.5rem);
  }

  .classBlock {
    order: 3;
    flex: 1 1 100%;
  }

  .guideModes {
    order: 4;
    flex: 1 1 100%;
  }

  .action {
    font-size: 0.82rem;
  }
}

@media (max-width: 640px) {
  .brandLogo {
    height: 2.85rem;
  }

  .actions {
    order: 2;
    flex: 1 1 100%;
    max-width: none;
    margin-left: 0;
    justify-content: flex-start;
  }

  .actions > :global(*) {
    padding: 0.3rem 1rem;
  }

  .actions > :global(*:first-child) {
    padding-left: 0;
  }

  .actions > :global(*:last-child) {
    padding-right: 0;
  }

  .classBlock {
    order: 3;
  }

  .guideModes {
    order: 4;
  }

  .filtersBar {
    padding-top: 0.7rem;
    padding-bottom: 0.85rem;
  }
}

@media (min-width: 1100px) {
  .headerInner {
    align-items: center;
    padding-block: 1.1rem;
    gap: 0.85rem 1.5rem;
  }

  .brand {
    order: 1;
  }

  .classBlock {
    order: 2;
    flex: 1 1 auto;
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
    align-items: center;
    min-height: 2.25rem;
    max-width: none;
  }
}
</style>
