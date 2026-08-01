<template>
  <div>
    <div
      v-if="pending"
      :class="$style.grid"
      aria-busy="true"
      aria-label="Загрузка классов"
    >
      <UiSkeleton v-for="n in 12" :key="n" variant="card" />
    </div>

    <div v-else-if="error" :class="$style.error">
      Не удалось загрузить классы. Проверьте API и обновите страницу.
    </div>

    <div v-else-if="emptyMessage" :class="[$style.empty, $style.fade]">
      {{ emptyMessage }}
    </div>

    <div v-else :class="[$style.grid, $style.fade]">
      <NuxtLink
        v-for="(klass, index) in classes"
        :key="klass.id"
        :to="`/class/${klass.slug}`"
        :prefetch="false"
        :class="[$style.card, !klass.has_content && $style.cardEmpty]"
      >
        <div :class="$style.media">
          <img
            v-if="klass.portrait_url"
            :src="cardPortraitUrl(klass.portrait_url)"
            :alt="klass.name_ru"
            width="360"
            height="480"
            :loading="index < EAGER_COUNT ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : undefined"
            decoding="async"
            :class="$style.img"
          >
          <div :class="$style.veil" />
          <span
            v-if="pendingByClass[klass.slug]"
            :class="$style.pendingBadge"
            :aria-label="`${pendingByClass[klass.slug]} заявок`"
          >
            {{ pendingByClass[klass.slug] }}
          </span>
          <div
            v-if="klass.tier_awakening || klass.tier_succession"
            :class="$style.tiers"
          >
            <div v-if="klass.tier_awakening" :class="$style.tierRow">
              <span :class="$style.tierLabel">Проб.</span>
              <ClassTierStars :tier="klass.tier_awakening" size="xs" />
            </div>
            <div v-if="klass.tier_succession" :class="$style.tierRow">
              <span :class="$style.tierLabel">Насл.</span>
              <ClassTierStars :tier="klass.tier_succession" size="xs" />
            </div>
          </div>
        </div>
        <div :class="$style.meta">
          <ClassIcon
            :slug="klass.slug"
            :icon-url="klass.icon_url"
            :label="klass.name_ru"
            size="sm"
          />
          <h2 :class="$style.name">{{ klass.name_ru }}</h2>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { cardPortraitUrl } from '@/entities/class/lib/cardPortrait'
import type { BdoClass } from '@/entities/class/model/types'
import ClassIcon from '@/entities/class/ui/ClassIcon.vue'
import ClassTierStars from '@/entities/class/ui/ClassTierStars.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'

/** First row only — avoid competing with the LCP image. */
const EAGER_COUNT = 2

withDefaults(
  defineProps<{
    classes: BdoClass[]
    pending: boolean
    error: boolean
    pendingByClass?: Record<string, number>
    emptyMessage?: string | null
  }>(),
  {
    pendingByClass: () => ({}),
    emptyMessage: null,
  },
)
</script>

<style module>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.85rem;
  }
}

.fade {
  animation: fade-in 320ms ease both;
}

.card {
  position: relative;
  display: block;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-ink);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-0.125rem);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-glow);
  color: var(--color-ink);
}

.cardEmpty {
  opacity: 0.42;
}

.cardEmpty:hover {
  opacity: 0.72;
}

.media {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--color-bg-deep);
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.veil {
  pointer-events: none;
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 45%;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
}

.pendingBadge {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 12;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
  border-radius: 999px;
  background: rgba(10, 11, 16, 0.85);
  color: var(--color-gold);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.25rem 0.4rem;
  text-align: center;
  pointer-events: none;
  user-select: none;
}

.tiers {
  position: absolute;
  top: 0.28rem;
  left: 0.28rem;
  right: 0.28rem;
  z-index: 12;
  display: flex;
  flex-direction: column;
  gap: 0.14rem;
  align-items: stretch;
}

.tierRow {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.12rem 0.3rem 0.12rem 0.35rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 40%, transparent);
  border-radius: 999px;
  background: rgba(10, 11, 16, 0.82);
  line-height: 0;
}

.tierRow :global([class*='root']) {
  margin-left: auto;
}

.tierLabel {
  font-size: 0.52rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-gold);
  line-height: 1;
  user-select: none;
  flex: none;
}

.meta {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.55rem 0.45rem;
}

.name {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.2;
  color: var(--color-ink);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
}

.error {
  animation: fade-in 320ms ease both;
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  padding: 1.5rem;
  color: var(--color-danger);
}

.empty {
  animation: fade-in 320ms ease both;
  border: 1px dashed var(--color-border);
  background: var(--color-gold-dim);
  padding: 1.5rem;
  color: var(--color-gold-soft);
  text-align: center;
}
</style>
