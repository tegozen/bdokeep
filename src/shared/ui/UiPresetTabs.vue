<template>
  <div
    :class="[
      $style.tabs,
      size === 'md' && $style.tabsMd,
      autoFit && $style.autoFit,
    ]"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="tab in tabs"
      :key="String(tab.id)"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :aria-disabled="disabled || tab.disabled"
      :disabled="disabled || tab.disabled"
      :class="[$style.tab, modelValue === tab.id && $style.tabOn]"
      @click="onSelect(tab.id)"
    >
      <slot name="tab" :tab="tab">{{ tab.label }}</slot>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
export type UiPresetTab<T extends string | number = string> = {
  id: T
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    tabs: ReadonlyArray<UiPresetTab<T>>
    modelValue: T
    ariaLabel?: string
    disabled?: boolean
    size?: 'sm' | 'md'
    /** Multi-column auto-fit grid. */
    autoFit?: boolean
  }>(),
  {
    ariaLabel: undefined,
    disabled: false,
    size: 'sm',
    autoFit: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

function onSelect(id: T) {
  if (props.disabled) return
  const tab = props.tabs.find((t) => t.id === id)
  if (tab?.disabled) return
  emit('update:modelValue', id)
}
</script>

<style module>
/* Segmented control. */
.tabs {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 2rem;
  min-width: 0;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, #000 35%, transparent);
  padding: 2px;
  gap: 0;
}

.tabsMd {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
}

.autoFit {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.tab {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: calc(2rem - 4px);
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1;
  padding: 0 0.75rem;
}

.tabsMd .tab {
  font-size: 0.9rem;
  padding: 0 0.5rem;
}

.autoFit .tab {
  font-size: 0.78rem;
  padding: 0 0.35rem;
}

.tab:hover:not(:disabled) {
  color: var(--color-gold-soft);
}

.tab:disabled {
  cursor: default;
  opacity: 0.55;
}

.tabOn {
  background: var(--color-gold-dim);
  color: var(--color-gold);
}
</style>
