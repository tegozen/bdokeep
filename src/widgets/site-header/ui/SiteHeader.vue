<template>
  <header
    :class="[
      $style.header,
      stableHeight && $style.headerStable,
      $slots.filters && $style.hasFilters,
    ]"
  >
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

        <div :class="$style.shell">
          <div :class="$style.actions">
            <slot
              name="actions"
              :badge-class="$style.actionBadge"
            />
          </div>

          <div v-if="$slots.filters" :class="$style.filtersPane">
            <slot name="filters" />
          </div>
        </div>
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
  background: transparent;
}

.headerBar {
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
  background: color-mix(in srgb, #050505 55%, transparent);
  backdrop-filter: blur(12px);
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

/* Desktop: shell dissolves — actions in the top row, filters full-width below. */
.shell {
  display: contents;
}

.actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  margin-left: auto;
  min-width: 0;
  min-height: 2.25rem;
}

.actionBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2rem;
  margin-left: auto;
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

.filtersPane {
  flex: 1 1 100%;
  order: 4;
  width: 100%;
  min-width: 0;
  padding-top: 1rem;
  padding-bottom: 0.15rem;
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
}

@media (max-width: 640px) {
  .headerBar {
    border-bottom-color: transparent;
  }

  .headerInner {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
    padding-block: 0.75rem 0.85rem;
  }

  .brand {
    order: 1;
    justify-content: center;
    width: 100%;
    min-height: 0;
  }

  .brandLogo {
    height: 3.1rem;
    max-width: min(17.5rem, 78vw);
  }

  .classBlock {
    order: 2;
    justify-content: center;
  }

  /*
    One chrome plate: nav + filters as a single continuation
    (logo above; subheader is the lower half of the same shell).
  */
  .shell {
    position: relative;
    order: 3;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
    padding: 0.35rem 0.45rem 0.55rem;
    border: 0;
    border-radius: 1rem;
    background: color-mix(in srgb, #050505 72%, transparent);
    backdrop-filter: blur(12px);
  }

  .shell::before {
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

  .actions,
  .filtersPane {
    position: relative;
    z-index: 1;
  }

  .actions {
    order: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    flex: none;
    width: 100%;
    max-width: none;
    margin-left: 0;
    min-height: 0;
    padding: 0.2rem;
  }

  /* UiButton cells fill the grid; icon/label/badge layout comes from UiButton. */
  .actions > :global(*) {
    width: 100%;
    min-height: 2.5rem;
  }

  .filtersPane {
    order: 1;
    flex: none;
    width: 100%;
    padding: 0.45rem 0.15rem 0.1rem;
    margin-top: 0.2rem;
    border-top: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
  }

  /* Nested filter cards dissolve into the shared shell. */
  .hasFilters .filtersPane > :global(*) {
    border-radius: 0;
    background: transparent;
    backdrop-filter: none;
    box-shadow: none;
    padding: 0.45rem 0.2rem 0.15rem;
  }

  .hasFilters .filtersPane > :global(*)::before {
    content: none;
  }
}

@media (min-width: 641px) {
  /*
    With filters in-flow, drop the solid bar edge so the gold filter
    card still reads as its own plate on page-bg (not boxed in the bar).
  */
  .hasFilters .headerBar {
    border-bottom-color: transparent;
  }

  .hasFilters .headerInner {
    padding-bottom: 0.25rem;
  }
}

@media (min-width: 1100px) {
  .headerInner {
    align-items: center;
    padding-block: 1.1rem;
    gap: 0.85rem 1.5rem;
  }

  .hasFilters .headerInner {
    padding-bottom: 0.25rem;
  }

  .brand {
    order: 1;
  }

  .classBlock {
    order: 2;
    flex: 1 1 auto;
  }

  .actions {
    order: 3;
    flex-wrap: nowrap;
    flex-shrink: 0;
    align-items: center;
    min-height: 2.25rem;
    max-width: none;
  }
}
</style>
