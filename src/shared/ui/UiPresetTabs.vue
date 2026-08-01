<template>
  <div
    :class="[$style.tabs, size === 'md' && $style.tabsMd, autoFit && $style.autoFit]"
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
    /** Multi-column auto-fit grid (buff category tabs). */
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
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
}

.tabsMd {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.autoFit {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
}

.tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  padding: 0.32rem 0.55rem;
}

.tabsMd .tab {
  font-size: 0.9rem;
  padding: 0.45rem 0.5rem;
}

.autoFit .tab {
  font-size: 0.78rem;
  padding: 0.4rem 0.35rem;
}

.tab:disabled {
  cursor: default;
  opacity: 0.55;
}

.tabOn {
  border-color: var(--color-border-strong);
  background: var(--color-gold-dim);
  color: var(--color-gold);
}
</style>
