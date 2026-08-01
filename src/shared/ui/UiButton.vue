<template>
  <button
    :type="type"
    :class="[
      $style.btn,
      $style[variant],
      size === 'sm' && $style.sm,
      attrs.class,
    ]"
    :disabled="disabled"
    v-bind="forwardedAttrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type UiButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type UiButtonSize = 'sm' | 'md'

withDefaults(
  defineProps<{
    variant?: UiButtonVariant
    size?: UiButtonSize
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
  },
)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>

<style module>
.btn {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1.25;
  padding: 0.45rem 0.9rem;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.sm {
  box-sizing: border-box;
  min-height: 2rem;
  font-size: 0.82rem;
  padding: 0.25rem 0.65rem;
  line-height: 1;
}

.primary {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}

.primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-gold) 22%, transparent);
}

.secondary {
  background: transparent;
  color: var(--color-muted);
}

.secondary:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-gold-soft);
}

.danger {
  border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
  background: transparent;
  color: var(--color-danger);
}

.danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.ghost {
  border-color: var(--color-border);
  background: transparent;
  color: var(--color-muted);
}

.ghost:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-ink);
}
</style>
