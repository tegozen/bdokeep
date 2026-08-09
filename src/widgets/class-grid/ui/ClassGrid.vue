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

    <div v-else-if="emptyMessage" :class="$style.fade">
      <div v-if="guildBanner" :class="$style.grid">
        <GuildRecruitBanner :data="guildBanner" :span="3" />
      </div>
      <div :class="$style.empty">
        {{ emptyMessage }}
      </div>
    </div>

    <div v-else :class="$style.grid">
      <GuildRecruitBanner
        v-if="guildBanner"
        :data="guildBanner"
        :span="3"
      />
      <div
        v-for="(bdoClass, index) in classes"
        :key="bdoClass.id"
        :class="$style.cardWrap"
      >
        <BorderSparkler v-if="pendingByClass[bdoClass.slug]" />
        <!-- Outside .card overflow so it can hang off the top-right corner. -->
        <span
          v-if="pendingByClass[bdoClass.slug]"
          :class="$style.pendingBadge"
          :aria-label="`${pendingByClass[bdoClass.slug]} заявок`"
        >
          {{ pendingByClass[bdoClass.slug] }}
        </span>
        <NuxtLink
          :to="`/class/${bdoClass.slug}`"
          :prefetch="false"
          :class="[$style.card, !bdoClass.has_content && $style.cardEmpty]"
        >
          <div :class="$style.media">
            <img
              v-if="bdoClass.portrait_url"
              :src="bdoClass.portrait_url"
              :alt="bdoClass.name_ru"
              width="360"
              height="480"
              loading="eager"
              :fetchpriority="index === lcpIndex ? 'high' : 'auto'"
              :decoding="index === lcpIndex ? 'sync' : 'async'"
              :class="$style.img"
            >
            <div :class="$style.veil" />
            <div
              v-if="hasAnyTier(bdoClass)"
              :class="$style.tiers"
            >
              <div
                v-for="row in tierRows(bdoClass)"
                :key="row.key"
                :class="$style.tierRow"
              >
                <span :class="$style.tierLabel">{{ row.label }}</span>
                <ClassTierStars :tier="row.tier" size="xs" compact />
              </div>
            </div>
          </div>
          <div :class="$style.meta">
            <ClassIcon
              :slug="bdoClass.slug"
              :icon-url="bdoClass.icon_url"
              :label="bdoClass.name_ru"
              size="sm"
            />
            <h2 :class="$style.name">{{ bdoClass.name_ru }}</h2>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BdoClass } from '@/entities/class/model/types'
import ClassIcon from '@/entities/class/ui/ClassIcon.vue'
import ClassTierStars from '@/entities/class/ui/ClassTierStars.vue'
import BorderSparkler from '@/features/superadmin-auth/ui/BorderSparkler.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import GuildRecruitBanner from '@/widgets/guild-banner/ui/GuildRecruitBanner.vue'
import type { GuildBannerPublic } from '@/widgets/guild-banner/model/types'

type TierRow = { key: string; label: string; tier: number }

function hasAnyTier(bdoClass: BdoClass) {
  return Boolean(
    bdoClass.tier_pvp_awakening ||
      bdoClass.tier_pvp_succession ||
      bdoClass.tier_pve_awakening ||
      bdoClass.tier_pve_succession,
  )
}

function tierRows(bdoClass: BdoClass): TierRow[] {
  const rows: TierRow[] = []
  if (bdoClass.tier_pvp_awakening) {
    rows.push({
      key: 'pvp_aw',
      label: 'ПВП·Проб.',
      tier: bdoClass.tier_pvp_awakening,
    })
  }
  if (bdoClass.tier_pvp_succession) {
    rows.push({
      key: 'pvp_succ',
      label: 'ПВП·Насл.',
      tier: bdoClass.tier_pvp_succession,
    })
  }
  if (bdoClass.tier_pve_awakening) {
    rows.push({
      key: 'pve_aw',
      label: 'ПВЕ·Проб.',
      tier: bdoClass.tier_pve_awakening,
    })
  }
  if (bdoClass.tier_pve_succession) {
    rows.push({
      key: 'pve_succ',
      label: 'ПВЕ·Насл.',
      tier: bdoClass.tier_pve_succession,
    })
  }
  return rows
}

/**
 * Whole grid is above the fold and portraits are tiny — all eager so LCP
 * cannot land on a lazy image. fetchpriority=high on the first filled card
 * (dimmed empties rarely win LCP). Equal-size race may still make LH's
 * "needs fetchpriority" checklist flaky; optimize the metric, not the checklist.
 */
const props = withDefaults(
  defineProps<{
    classes: BdoClass[]
    pending: boolean
    error: boolean
    pendingByClass?: Record<string, number>
    emptyMessage?: string | null
    guildBanner?: GuildBannerPublic | null
  }>(),
  {
    pendingByClass: () => ({}),
    emptyMessage: null,
    guildBanner: null,
  },
)

const lcpIndex = computed(() => {
  const i = props.classes.findIndex(
    (bdoClass) => bdoClass.has_content && bdoClass.portrait_url,
  )
  return i >= 0 ? i : 0
})
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
  animation: fade-in 320ms ease;
}

.cardWrap {
  position: relative;
  align-self: start;
  /* Must stay visible so BorderSparkler can bleed past the card. */
  overflow: visible;
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
  top: -0.4rem;
  right: -0.4rem;
  z-index: 14;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
  border-radius: 999px;
  background: rgba(10, 11, 16, 0.92);
  color: var(--color-gold);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.25rem 0.4rem;
  text-align: center;
  pointer-events: none;
  user-select: none;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
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
  animation: fade-in 320ms ease;
  border: 1px solid var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  padding: 1.5rem;
  color: var(--color-danger);
}

.empty {
  animation: fade-in 320ms ease;
  border: 1px dashed var(--color-border);
  background: var(--color-gold-dim);
  padding: 1.5rem;
  color: var(--color-gold-soft);
  text-align: center;
}
</style>
