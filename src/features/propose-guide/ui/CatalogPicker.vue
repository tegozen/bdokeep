<template>
  <div :class="[$style.root, (fill || tall) && $style.rootGrow]">
    <div :class="[$style.toolbar, !$slots.tabs && $style.toolbarSolo]">
      <div v-if="$slots.tabs" :class="$style.tabs">
        <slot name="tabs" />
      </div>
      <input
        :value="query"
        type="search"
        :class="[$style.input, searchClass]"
        :placeholder="placeholder"
        :aria-label="ariaLabel || placeholder"
        :disabled="disabled"
        @input="onQuery"
      >
    </div>

    <div v-if="pending" :class="$style.muted">{{ pendingText }}</div>
    <div v-else-if="error" :class="$style.error">{{ errorText }}</div>
    <ul
      v-else
      :class="[
        $style.catalog,
        fill && $style.catalogFill,
        tall && $style.catalogTall,
        catalogOff && $style.catalogOff,
        catalogClass,
      ]"
    >
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          :class="[$style.catalogBtn, isPicked?.(item) && $style.picked]"
          :disabled="isDisabled?.(item)"
          @click="emit('pick', item)"
        >
          <img
            v-if="item.icon_url"
            :src="codexIconSrc(item.icon_url) || item.icon_url"
            alt=""
            :class="$style.icon"
            loading="lazy"
          >
          <span :class="$style.name">{{ itemLabel?.(item) ?? item.name_ru }}</span>
          <span :class="$style.add">+</span>
        </button>
      </li>
    </ul>

    <p v-if="showEmpty" :class="$style.muted">{{ emptyText }}</p>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string; name_ru: string; icon_url?: string | null }">
import { codexIconSrc } from '@/shared/lib'

const props = withDefaults(
  defineProps<{
    items: readonly T[]
    query: string
    pending?: boolean
    error?: boolean
    disabled?: boolean
    catalogOff?: boolean
    /** Grow to fill board-side panels instead of fixed 16rem height. */
    fill?: boolean
    /** Same stretch behavior as fill (legacy alias for crystal board). */
    tall?: boolean
    placeholder?: string
    ariaLabel?: string
    pendingText?: string
    errorText?: string
    emptyText?: string
    showEmpty?: boolean
    searchClass?: string
    catalogClass?: string
    isPicked?: (item: T) => boolean
    isDisabled?: (item: T) => boolean
    itemLabel?: (item: T) => string
  }>(),
  {
    pending: false,
    error: false,
    disabled: false,
    catalogOff: false,
    fill: false,
    tall: false,
    placeholder: 'Поиск',
    ariaLabel: undefined,
    pendingText: 'Загрузка…',
    errorText: 'Не удалось загрузить каталог.',
    emptyText: 'Ничего не найдено',
    showEmpty: false,
    searchClass: undefined,
    catalogClass: undefined,
    isPicked: undefined,
    isDisabled: undefined,
    itemLabel: undefined,
  },
)

const emit = defineEmits<{
  'update:query': [value: string]
  pick: [item: T]
}>()

function onQuery(e: Event) {
  emit('update:query', (e.target as HTMLInputElement).value)
}
</script>

<style module>
.root {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.rootGrow {
  flex: 1 1 0;
  align-self: stretch;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: stretch;
  gap: 0.55rem;
  flex-shrink: 0;
  min-width: 0;
}

.toolbarSolo .input {
  flex: 1;
}

.tabs {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  min-width: 0;
}

.tabs > :deep(*) {
  height: 100%;
}

.input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  flex: 1 1 auto;
  flex-shrink: 1;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  line-height: 1;
  padding: 0 0.65rem;
}

.catalog {
  flex: none;
  height: 16rem;
  margin: 0;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  padding: 0.25rem;
  background: var(--color-bg);
}

.catalogFill {
  flex: 1 1 0;
  height: auto;
  max-height: none;
  min-height: 0;
}

.catalogTall {
  flex: 1 1 0;
  height: auto;
  max-height: none;
  min-height: 0;
}

.catalogOff {
  opacity: 0.45;
  pointer-events: none;
}

.catalogBtn {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  text-align: left;
  padding: 0.4rem 0.45rem;
}

.catalogBtn:hover:not(:disabled) {
  background: var(--color-gold-dim);
}

.catalogBtn:disabled {
  cursor: default;
  opacity: 0.55;
}

.picked {
  background: var(--color-gold-dim);
}

.icon {
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  object-fit: contain;
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add {
  flex-shrink: 0;
  color: var(--color-gold);
  font-weight: 700;
}

.muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}
</style>
