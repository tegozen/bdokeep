<template>
  <div
    :class="[$style.skeleton, $style[variant]]"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'block' | 'text' | 'avatar' | 'card'
    width?: string
    height?: string
  }>(),
  {
    variant: 'block',
  },
)
</script>

<style module>
.skeleton {
  animation: shimmer 1.4s ease-in-out infinite;
  border: 1px solid color-mix(in srgb, var(--color-gold) 15%, transparent);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(212, 175, 98, 0.12) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 200% 100%;
}

.block {
  min-height: 1rem;
  border-radius: 0.125rem;
}

.text {
  height: 0.875rem;
  border-radius: 0.125rem;
}

.avatar {
  aspect-ratio: 1;
  border-radius: 9999px;
}

.card {
  aspect-ratio: 3 / 4;
  border-radius: 0.125rem;
}
</style>
