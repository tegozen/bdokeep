<template>
  <section
    :id="anchor"
    :class="[$style.section, flush && $style.flush, fill && $style.fill]"
  >
    <header :class="$style.head">
      <div :class="$style.titleRow">
        <h2 :class="$style.title">{{ title }}</h2>
        <div v-if="$slots.beside" :class="$style.beside">
          <slot name="beside" />
        </div>
        <div v-if="$slots.actions" :class="$style.actions">
          <slot name="actions" />
        </div>
      </div>
      <p v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</p>
    </header>
    <div :class="$style.body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    anchor: string
    /** Drop bottom margin (e.g. when nested in a row). */
    flush?: boolean
    /** Fill parent height; body scrolls when content overflows. */
    fill?: boolean
  }>(),
  { flush: false, fill: false },
)
</script>

<style module>
.section {
  margin-bottom: 2.5rem;
  scroll-margin-top: 5rem;
}

.flush {
  margin-bottom: 0;
}

.fill {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.fill .head {
  flex-shrink: 0;
}

.fill .body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.head {
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.625rem;
}

.titleRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}

.title {
  margin: 0;
  font-size: 1.35rem;
}

.beside {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.actions {
  margin-left: auto;
  flex-shrink: 0;
}

.subtitle {
  margin: 0.375rem 0 0;
  font-size: 0.95rem;
  color: var(--color-muted);
}
</style>
