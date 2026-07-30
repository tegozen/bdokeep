<template>
  <section :id="anchor" :class="$style.section">
    <header :class="$style.head">
      <h2 :class="$style.title">{{ title }}</h2>
      <p v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</p>
    </header>
    <div>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  anchor: string
}>()
</script>

<style module>
.section {
  margin-bottom: 2.5rem;
  scroll-margin-top: 5rem;
}

.head {
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.625rem;
}

.title {
  margin: 0;
  font-size: 1.35rem;
}

.subtitle {
  margin: 0.375rem 0 0;
  font-size: 0.95rem;
  color: var(--color-muted);
}
</style>
