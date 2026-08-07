<template>
  <aside
    v-if="publicVisible"
    :class="[$style.root, span === 3 ? $style.span3 : $style.cardMatch]"
    aria-label="Набор в гильдию"
  >
    <img
      v-if="data?.enabled && data.has_icon"
      :src="iconSrc"
      alt=""
      width="56"
      height="56"
      :class="$style.icon"
      decoding="async"
    >
    <div :class="$style.copy">
      <p v-if="data?.enabled && data.body" :class="$style.body">{{ data.body }}</p>
      <ul v-if="links.length" :class="$style.links">
        <li v-for="(link, i) in links" :key="`${link.url}-${i}`">
          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            :class="$style.link"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GuildBannerPublic } from '../model/types'

export type { GuildBannerLink, GuildBannerPublic } from '../model/types'

const props = withDefaults(
  defineProps<{
    data: GuildBannerPublic | null
    /** На главной: 3 колонки, высота тянется по ряду карточек (без aspect-ratio — не раздувает грид). */
    span?: 1 | 3
  }>(),
  { span: 1 },
)

const links = computed(() =>
  props.data?.enabled === true && Array.isArray(props.data.links) ? props.data.links : [],
)

const publicVisible = computed(() => {
  if (!props.data || props.data.enabled !== true) return false
  return Boolean(props.data.body) || props.data.has_icon || links.value.length > 0
})

const iconSrc = computed(() => {
  if (!props.data || props.data.enabled !== true || !props.data.has_icon) return ''
  const v = encodeURIComponent(props.data.updated_at || '')
  return `/api/guild-banner/icon?v=${v}`
})
</script>

<style module>
.root {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.75rem 0.9rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-gold-dim) 70%, var(--color-bg-elevated)),
      var(--color-bg-elevated) 55%
    );
  color: var(--color-ink);
  padding: 0.65rem 0.8rem;
}

/* Главная: занимает 3 трека, высоту даёт ряд карточек (stretch), сам треки не раздувает. */
.span3 {
  grid-column: span 3;
  align-self: stretch;
  width: auto;
  height: auto;
  overflow: hidden;
}

/*
  Страница класса: высота/ширина как ~3 карточки ClassGrid.
  Без % ширины — иначе во flex родитель раздувается на всю строку.
*/
.cardMatch {
  width: calc(3 * 108px + 2 * 0.75rem);
  height: calc(108px * 4 / 3);
  max-width: 100%;
}

@media (min-width: 768px) {
  .cardMatch {
    width: calc(3 * 120px + 2 * 0.85rem);
    height: calc(120px * 4 / 3);
  }
}

.icon {
  flex: 0 0 auto;
  width: clamp(2.25rem, 16%, 3.25rem);
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: 0.25rem;
}

.copy {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  justify-content: center;
  overflow: hidden;
}

.body {
  margin: 0;
  color: var(--color-gold);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.links {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.55rem 0.85rem;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.link {
  flex: 0 0 auto;
  color: var(--color-gold-soft);
  font-size: 0.78rem;
  line-height: 1.3;
  text-decoration: underline;
  text-underline-offset: 0.12em;
  white-space: nowrap;
}

.link:hover {
  color: var(--color-ink);
}

@media (max-width: 520px) {
  .span3 {
    grid-column: 1 / -1;
  }
}
</style>
