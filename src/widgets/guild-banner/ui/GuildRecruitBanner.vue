<template>
  <aside
    v-if="publicVisible"
    :class="[$style.root, span === 3 ? $style.span3 : $style.cardMatch]"
    aria-label="Набор в гильдию"
  >
    <img
      src="/brand/banner-frame.png"
      alt=""
      width="292"
      height="218"
      :class="$style.frame"
      decoding="async"
      aria-hidden="true"
    >

    <div v-if="data?.enabled && data.has_icon" :class="$style.iconWrap">
      <img
        :src="iconSrc"
        alt=""
        width="72"
        height="72"
        :class="$style.icon"
        decoding="async"
      >
    </div>

    <div :class="$style.copy">
      <div v-if="data?.enabled && data.body" :class="$style.body">
        <UiMarkdownPreview :model-value="data.body" />
      </div>
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
import { computed, defineAsyncComponent } from 'vue'
import type { GuildBannerPublic } from '../model/types'

const UiMarkdownPreview = defineAsyncComponent(
  () => import('@/shared/ui/UiMarkdownPreview.vue'),
)

export type { GuildBannerLink, GuildBannerPublic } from '../model/types'

const props = withDefaults(
  defineProps<{
    data: GuildBannerPublic | null
    /** На главной: 3 колонки; высота по пропорции рамки, не растягиваем. */
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
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: #d4af62;
}

.frame {
  position: absolute;
  inset: 0;
  /* Above icon so the punched hole masks it to the ornate ring. */
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

/* Главная: 3 колонки, высота = ряд карточек. */
.span3 {
  grid-column: span 3;
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 0;
}

/* Страница класса: ширина как ~3 карточки, высота по рамке. */
.cardMatch {
  width: calc(3 * 130px + 2 * 0.85rem);
  max-width: 100%;
  aspect-ratio: 292 / 218;
  height: auto;
}

@media (min-width: 768px) {
  .cardMatch {
    width: calc(3 * 148px + 2 * 0.9rem);
  }
}

.iconWrap {
  /*
    Center of the transparent hole punched in banner-frame.png (292×218):
    measured concentric to the ornate ring → (61.5, 81) ≈ 21.06% / 37.16%.
    Icon sits under the frame; the ring masks edges.
  */
  position: absolute;
  z-index: 1;
  left: 21.06%;
  top: 37.16%;
  width: 23.5%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  overflow: hidden;
  background: #0a0908;
}

.icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
}

.copy {
  position: absolute;
  z-index: 3;
  left: 38%;
  right: 7.5%;
  top: 13%;
  bottom: 13%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
}

.body {
  margin: 0;
  color: #d4af62;
  font-size: clamp(0.72rem, 2.1vw, 0.9rem);
  font-weight: 500;
  line-height: 1.35;
  overflow-wrap: anywhere;
  overflow: auto;
  max-height: 100%;
}

.body :global(p) {
  margin: 0 0 0.35em;
  color: #d4af62;
}

.body :global(p:last-child) {
  margin-bottom: 0;
}

.body :global(h1),
.body :global(h2),
.body :global(h3) {
  margin: 0 0 0.2em;
  font-family: Georgia, "Palatino Linotype", "Book Antiqua", "Times New Roman", serif;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #e4c278;
  text-shadow: 0 0 10px rgba(212, 175, 98, 0.28);
}

.body :global(h1) {
  font-size: 1.45em;
  line-height: 1.1;
}

.body :global(h2) {
  font-size: 1.22em;
  line-height: 1.12;
}

.body :global(h3) {
  font-size: 1.05em;
  line-height: 1.15;
}

.body :global(strong) {
  color: #e4c278;
  font-weight: 700;
}

.body :global(ul),
.body :global(ol) {
  margin: 0.15em 0 0.3em;
  padding-left: 1.1em;
}

.body :global(a) {
  color: #e2c48a;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

.links {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.45rem 0.75rem;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.link {
  flex: 0 0 auto;
  color: #e2c48a;
  font-size: 0.78rem;
  line-height: 1.3;
  text-decoration: underline;
  text-underline-offset: 0.12em;
  white-space: nowrap;
}

.link:hover {
  color: #f0d9a0;
}

/*
  Narrow grids (<3 tracks): banner is alone on a row — stretch height
  collapses to 0 without an intrinsic ratio. Use the frame aspect.
*/
@media (max-width: 700px) {
  .span3 {
    grid-column: 1 / -1;
    align-self: start;
    height: auto;
    aspect-ratio: 292 / 218;
  }
}
</style>
