<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="rootClass"
    :style="colorStyle"
    v-bind="forwardedAttrs"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :class="rootClass"
    :style="colorStyle"
    :disabled="disabled"
    v-bind="forwardedAttrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs, useCssModule } from 'vue'

export type UiButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type UiButtonSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: UiButtonVariant
    size?: UiButtonSize
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    /** Render as NuxtLink with the same button chrome. */
    to?: string
    /** Stretch to container width (header action grid). */
    block?: boolean
    /** Soft corner radius (default buttons stay sharp). */
    rounded?: boolean
    /** Text color (CSS color / var()). */
    color?: string
    /** Icon color; defaults to `color` when omitted. */
    iconColor?: string
    /** Hover color for text + icons. */
    hoverColor?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    to: undefined,
    block: false,
    rounded: false,
    color: undefined,
    iconColor: undefined,
    hoverColor: undefined,
  },
)

defineOptions({ inheritAttrs: false })

const $style = useCssModule()
const attrs = useAttrs()

const forwardedAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const hasCustomColor = computed(
  () => Boolean(props.color || props.iconColor || props.hoverColor),
)

const rootClass = computed(() => [
  $style.btn,
  $style[props.variant],
  props.size === 'sm' && $style.sm,
  props.block && $style.block,
  props.rounded && $style.rounded,
  hasCustomColor.value && $style.customColor,
  attrs.class,
])

const colorStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.color) style['--ui-btn-color'] = props.color
  if (props.iconColor) style['--ui-btn-icon-color'] = props.iconColor
  if (props.hoverColor) style['--ui-btn-hover-color'] = props.hoverColor

  const attrStyle = attrs.style
  if (attrStyle && typeof attrStyle === 'object' && !Array.isArray(attrStyle)) {
    return { ...attrStyle, ...style }
  }
  return style
})
</script>

<style module>
.btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  min-height: 2rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1;
  padding: 0 0.9rem;
  text-decoration: none;
  white-space: nowrap;
}

.btn :global(svg) {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 1.05rem;
  color: inherit;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.block {
  width: 100%;
}

.rounded {
  border-radius: 0.55rem;
}

.sm {
  box-sizing: border-box;
  min-height: 2rem;
  font-size: 0.82rem;
  padding: 0 0.65rem;
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

/* Prop-driven colors override variant text/icon palette. */
.customColor {
  color: var(--ui-btn-color, inherit);
}

.customColor :global(svg) {
  color: var(--ui-btn-icon-color, var(--ui-btn-color, inherit));
}

.customColor:hover:not(:disabled) {
  color: var(--ui-btn-hover-color, var(--ui-btn-color, inherit));
}

.customColor:hover:not(:disabled) :global(svg) {
  color: var(
    --ui-btn-hover-color,
    var(--ui-btn-icon-color, var(--ui-btn-color, inherit))
  );
}
</style>
