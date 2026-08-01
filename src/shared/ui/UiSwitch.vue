<template>
  <label
    :class="[
      $style.root,
      size === 'sm' && $style.sm,
      labelPlacement === 'top' && $style.top,
      disabled && $style.disabled,
      attrs.class,
    ]"
  >
    <span
      v-if="label || $slots.default"
      :class="[
        $style.label,
        labelPlacement === 'start' && $style.labelStart,
        labelPlacement === 'top' && $style.labelTop,
      ]"
    >
      <slot>{{ label }}</slot>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="ariaLabel || label || undefined"
      :disabled="disabled"
      :class="[$style.control, model && $style.on]"
      v-bind="forwardedAttrs"
      @click="toggle"
    >
      <span :class="$style.track" aria-hidden="true">
        <span :class="$style.thumb" />
      </span>
    </button>
  </label>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type UiSwitchSize = 'sm' | 'md'
export type UiSwitchLabelPlacement = 'start' | 'end' | 'top'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    label?: string
    ariaLabel?: string
    disabled?: boolean
    size?: UiSwitchSize
    labelPlacement?: UiSwitchLabelPlacement
  }>(),
  {
    modelValue: false,
    label: '',
    ariaLabel: '',
    disabled: false,
    size: 'md',
    labelPlacement: 'start',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const model = computed({
  get: () => Boolean(props.modelValue),
  set: (v: boolean) => emit('update:modelValue', v),
})

const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

function toggle() {
  if (props.disabled) return
  model.value = !model.value
}
</script>

<style module>
.root {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  user-select: none;
  color: var(--color-gold-soft);
  font-size: 0.82rem;
  line-height: 1;
}

.root:hover:not(.disabled) {
  color: var(--color-gold);
}

.sm {
  font-size: 0.78rem;
  gap: 0.45rem;
}

.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.top {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
}

.sm.top {
  gap: 0.22rem;
}

.label {
  order: 2;
}

.labelStart {
  order: 0;
}

.labelTop {
  order: 0;
  white-space: nowrap;
}

.control {
  order: 1;
  appearance: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: inherit;
  line-height: 0;
}

.control:focus-visible .track {
  outline: 2px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
  outline-offset: 2px;
}

.track {
  position: relative;
  display: block;
  width: 2.1rem;
  height: 1.2rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, #000 40%, var(--color-bg-elevated));
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.sm .track {
  width: 1.85rem;
  height: 1.05rem;
}

.thumb {
  position: absolute;
  top: 50%;
  left: 0.12rem;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  background: var(--color-muted);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  transform: translateY(-50%);
  transition:
    transform 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.sm .thumb {
  width: 0.72rem;
  height: 0.72rem;
}

.on .track {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 20%, transparent);
}

.on .thumb {
  background: var(--color-gold);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.4),
    0 0 8px color-mix(in srgb, var(--color-gold) 35%, transparent);
  transform: translate(0.85rem, -50%);
}

.sm .on .thumb {
  transform: translate(0.72rem, -50%);
}

.root:hover:not(.disabled) .track {
  border-color: var(--color-border-strong);
}

.root:hover:not(.disabled) .on .track {
  background: color-mix(in srgb, var(--color-gold) 22%, transparent);
}
</style>
