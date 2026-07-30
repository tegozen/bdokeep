<template>
  <ul :class="[$style.list, $style.fade]">
    <li v-for="row in rows" :key="row.id" :class="$style.item">
      <img
        v-if="row.items?.icon_url"
        :src="row.items.icon_url"
        alt=""
        :class="$style.icon"
        loading="lazy"
      >
      <div>
        <strong>{{ row.items?.name_ru || row.slot || 'Предмет' }}</strong>
        <span v-if="row.slot" :class="$style.muted"> · {{ row.slot }}</span>
        <p v-if="row.notes" :class="$style.notes">{{ row.notes }}</p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { GuideItemRow } from '@/entities/class'

defineProps<{
  rows: GuideItemRow[]
}>()
</script>

<style module>
.list {
  margin: 0;
  display: grid;
  list-style: none;
  gap: 0.75rem;
  padding: 0;
}

.fade {
  animation: fade-in 320ms ease both;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-panel);
  padding: 0.75rem;
}

.icon {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  background: #000;
  object-fit: contain;
}

.muted {
  font-weight: 400;
  color: var(--color-muted);
}

.notes {
  margin: 0.375rem 0 0;
  font-size: 0.92rem;
  color: var(--color-muted);
}
</style>
