<template>
  <div :class="[$style.wrap, fill && $style.fill]">
    <div :class="[$style.toolbar, !$slots.tabs && $style.toolbarSolo]">
      <div v-if="$slots.tabs" :class="$style.tabs">
        <slot name="tabs" />
      </div>
      <input
        :value="query"
        type="search"
        :class="$style.search"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        @input="onQuery"
      >
    </div>

    <p v-if="pending" :class="$style.hint">{{ pendingText }}</p>
    <p v-else-if="error" :class="$style.err">Не удалось загрузить наборы</p>
    <p v-else-if="!filtered.length" :class="$style.hint">
      {{ emptyText }}
    </p>
    <ul v-else :class="$style.list">
      <li v-for="set in filtered" :key="set.id" :class="$style.card">
        <div :class="$style.head">
          <p :class="$style.name">{{ set.name_ru }}</p>
          <div :class="$style.icons" aria-hidden="true">
            <img
              v-for="(stone, i) in previewStones(set)"
              :key="`${set.id}-${i}-${stone.id}`"
              :src="codexIconSrc(stone.icon_url) || undefined"
              alt=""
              :class="$style.icon"
              loading="lazy"
              draggable="false"
            >
          </div>
        </div>
        <ul :class="$style.bonuses">
          <li v-for="(b, i) in set.bonuses" :key="`${set.id}-b-${i}`">
            {{ b.label }}
          </li>
        </ul>
        <div :class="$style.actions">
          <button
            type="button"
            :class="$style.apply"
            :disabled="!set.normal.length"
            @click="emit('apply', set, 'normal')"
          >
            Обычный
          </button>
          <button
            type="button"
            :class="$style.apply"
            :disabled="!set.enhanced.length"
            @click="emit('apply', set, 'enhanced')"
          >
            Усиленный
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LightstoneSet } from '@/entities/class'
import { codexIconSrc } from '@/shared/lib'

const props = withDefaults(
  defineProps<{
    sets: LightstoneSet[]
    query: string
    pending?: boolean
    error?: boolean
    fill?: boolean
    placeholder?: string
    ariaLabel?: string
    pendingText?: string
    emptyText?: string
  }>(),
  {
    pending: false,
    error: false,
    fill: false,
    placeholder: 'Поиск',
    ariaLabel: 'Поиск набора',
    pendingText: 'Загрузка наборов…',
    emptyText: 'Нет наборов по поиску.',
  },
)

const emit = defineEmits<{
  'update:query': [string]
  apply: [set: LightstoneSet, variant: 'normal' | 'enhanced']
}>()

const filtered = computed(() => {
  const q = props.query.trim().toLowerCase()
  return props.sets.filter((s) => {
    if (s.category === 'lifeskill') return false
    if (!q) return true
    if (s.name_ru.toLowerCase().includes(q)) return true
    if (s.name_en?.toLowerCase().includes(q)) return true
    return s.bonuses.some((b) => b.label.toLowerCase().includes(q))
  })
})

function previewStones(set: LightstoneSet) {
  return set.normal.length ? set.normal : set.enhanced
}

function onQuery(e: Event) {
  emit('update:query', (e.target as HTMLInputElement).value)
}
</script>

<style module>
.wrap {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.fill {
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

.tabs {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  min-width: 0;
}

.tabs > :deep(*) {
  height: 100%;
}

.search {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  flex: 1 1 auto;
  padding: 0 0.65rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-ink);
  font: inherit;
  line-height: 1;
}

.hint,
.err {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.err {
  color: var(--color-danger);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
}

.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 0.35rem 0.75rem;
  flex-shrink: 0;
  padding: 0.65rem 0.7rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-panel) 88%, #000);
}

.head {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

.name {
  margin: 0 0 0.35rem;
  font-weight: 650;
  font-size: 0.98rem;
}

.icons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.icon {
  width: 1.65rem;
  height: 1.65rem;
  object-fit: contain;
  border-radius: 0.25rem;
  background: color-mix(in srgb, #000 35%, transparent);
}

.bonuses {
  grid-column: 1;
  grid-row: 2;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.82rem;
  opacity: 0.88;
  line-height: 1.35;
}

.actions {
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35rem;
}

.apply {
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-gold) 16%, transparent);
  color: inherit;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}

.apply:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-gold) 28%, transparent);
}

.apply:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .card {
    grid-template-columns: 1fr;
  }

  .actions {
    grid-column: 1;
    grid-row: 3;
    flex-direction: row;
  }

  .apply {
    flex: 1;
  }
}
</style>
