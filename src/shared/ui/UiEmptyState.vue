<template>
  <div :class="$style.empty" role="status">
    <p :class="$style.title">{{ title }}</p>
    <p v-if="description" :class="$style.desc">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Данных пока нет',
    description: 'Гайд ещё не заполнен. Контент появится после обновления в Studio.',
  },
)
</script>

<style module>
.empty {
  border: 1px dashed var(--color-border);
  background: var(--color-gold-dim);
  padding: 1.25rem 1.5rem;
  text-align: center;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.025em;
  color: var(--color-gold-soft);
}

.desc {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  color: var(--color-muted);
}
</style>
