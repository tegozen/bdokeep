<template>
  <span
    :class="[$style.icon, $style[size]]"
    :style="{ '--class-icon-url': `url('${src}')` }"
    :aria-label="label"
    role="img"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    slug: string
    iconUrl?: string | null
    label?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    iconUrl: null,
    label: undefined,
    size: 'md',
  },
)

const src = computed(() => props.iconUrl || `/classes/${props.slug}/icon.svg`)
</script>

<style module>
.icon {
  display: inline-block;
  flex-shrink: 0;
  background-color: var(--color-gold);
  -webkit-mask-image: var(--class-icon-url);
  mask-image: var(--class-icon-url);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.sm {
  width: 1.25rem;
  height: 1.25rem;
}

.md {
  width: 1.75rem;
  height: 1.75rem;
}

.lg {
  width: 2.5rem;
  height: 2.5rem;
}
</style>
