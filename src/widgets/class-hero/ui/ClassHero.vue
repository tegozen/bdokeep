<template>
  <div v-if="pending" :class="$style.hero" aria-busy="true">
    <UiSkeleton variant="card" width="180px" height="240px" />
    <div :class="$style.text">
      <UiSkeleton variant="text" width="40%" height="1.6rem" />
      <UiSkeleton variant="text" width="70%" height="1rem" class="mt-3" />
      <UiSkeleton variant="text" width="55%" height="1rem" class="mt-2" />
    </div>
  </div>
  <header v-else-if="klass" :class="[$style.hero, $style.fade]">
    <div :class="$style.portrait">
      <img
        v-if="klass.portrait_url"
        :src="klass.portrait_url"
        :alt="klass.name_ru"
        :class="$style.img"
      >
    </div>
    <div :class="$style.text">
      <p :class="$style.eyebrow">
        <NuxtLink to="/">← Все классы</NuxtLink>
      </p>
      <div :class="$style.titleRow">
        <ClassIcon
          :slug="klass.slug"
          :icon-url="klass.icon_url"
          :label="klass.name_ru"
          size="lg"
        />
        <h1 :class="$style.title">{{ klass.name_ru }}</h1>
      </div>
      <div v-if="klass.tier || editable" :class="$style.tierRow">
        <ClassTierStars
          :tier="klass.tier"
          :editable="editable"
          :saving="saving"
          @change="(tier) => $emit('tier-change', tier)"
        />
      </div>
      <p v-else :class="[$style.role, $style.roleMuted]">Тир ещё не указан</p>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ClassIcon, ClassTierStars, type BdoClass } from '@/entities/class'
import { UiSkeleton } from '@/shared/ui'

withDefaults(
  defineProps<{
    klass?: BdoClass | null
    pending?: boolean
    editable?: boolean
    saving?: boolean
  }>(),
  {
    klass: null,
    pending: false,
    editable: false,
    saving: false,
  },
)

defineEmits<{
  'tier-change': [tier: number | null]
}>()
</script>

<style module>
.hero {
  margin-bottom: 2rem;
  display: grid;
  gap: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .hero {
    grid-template-columns: 180px 1fr;
    align-items: end;
  }
}

.fade {
  animation: fade-in 320ms ease both;
}

.portrait {
  width: min(180px, 45vw);
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-glow);
}

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.eyebrow {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
}

.tierRow {
  margin-top: 0.65rem;
}

.role {
  margin: 0.75rem 0 0;
  color: var(--color-ink);
}

.roleMuted {
  color: var(--color-muted);
}

.text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
